import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageNode {
  name: string;
  path: string;
  dependencies: string[];
}

function scanWorkspace(): Map<string, PackageNode> {
  const root = resolve(__dirname, '..');
  const packagesMap = new Map<string, PackageNode>();
  const scanDirs = ['packages', 'apps', 'sdks', 'tests'];

  for (const dir of scanDirs) {
    const fullDir = join(root, dir);
    if (!existsSync(fullDir)) continue;

    const subdirs = readdirSync(fullDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const sub of subdirs) {
      const pkgJsonPath = join(fullDir, sub, 'package.json');
      if (existsSync(pkgJsonPath)) {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
        const internalDeps = Object.keys({
          ...pkg.dependencies,
          ...pkg.devDependencies,
        }).filter((dep) => dep.startsWith('@controlplane/'));

        packagesMap.set(pkg.name, {
          name: pkg.name,
          path: join(dir, sub),
          dependencies: internalDeps,
        });
      }
    }
  }

  return packagesMap;
}

export function detectCycles(): { hasCycle: boolean; cyclePath: string[] } {
  const nodes = scanWorkspace();
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(current: string, stack: string[]): { hasCycle: boolean; cyclePath: string[] } {
    visited.add(current);
    inStack.add(current);
    stack.push(current);

    const node = nodes.get(current);
    if (node) {
      for (const dep of node.dependencies) {
        if (!visited.has(dep)) {
          const res = dfs(dep, stack);
          if (res.hasCycle) return res;
        } else if (inStack.has(dep)) {
          return { hasCycle: true, cyclePath: [...stack, dep] };
        }
      }
    }

    inStack.delete(current);
    stack.pop();
    return { hasCycle: false, cyclePath: [] };
  }

  for (const name of nodes.keys()) {
    if (!visited.has(name)) {
      const res = dfs(name, []);
      if (res.hasCycle) return res;
    }
  }

  return { hasCycle: false, cyclePath: [] };
}

if (process.argv[1]?.includes('verify-no-circular-deps')) {
  const result = detectCycles();
  if (result.hasCycle) {
    console.error('Circular dependency detected:', result.cyclePath.join(' -> '));
    process.exit(1);
  } else {
    console.log('Zero circular dependencies found in monorepo DAG.');
    process.exit(0);
  }
}
