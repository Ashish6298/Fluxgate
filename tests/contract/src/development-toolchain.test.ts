import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PHASE 0.4 — Development Toolchain Verification', () => {
  const root = resolve(__dirname, '../../..');

  it('should verify all required root scripts are defined in package.json', () => {
    const pkgPath = resolve(root, 'package.json');
    expect(existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const requiredScripts = [
      'build',
      'test',
      'test:unit',
      'test:integration',
      'lint',
      'format',
      'format:check',
      'typecheck',
      'clean',
    ];

    for (const script of requiredScripts) {
      expect(pkg.scripts, `Missing required script: ${script}`).toHaveProperty(script);
    }
  });

  it('should verify strict TypeScript baseline configuration', () => {
    const tsconfigBasePath = resolve(root, 'tsconfig.base.json');
    expect(existsSync(tsconfigBasePath)).toBe(true);

    const tsconfig = JSON.parse(readFileSync(tsconfigBasePath, 'utf8'));
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
    expect(tsconfig.compilerOptions.strictNullChecks).toBe(true);
  });

  it('should verify toolchain guide document exists', () => {
    const docPath = resolve(root, 'docs/operations/development-toolchain.md');
    expect(existsSync(docPath)).toBe(true);

    const content = readFileSync(docPath, 'utf8');
    expect(content).toContain('Standard Reproducible Workflow');
    expect(content).toContain('pnpm install');
    expect(content).toContain('pnpm run build');
    expect(content).toContain('pnpm test');
  });
});
