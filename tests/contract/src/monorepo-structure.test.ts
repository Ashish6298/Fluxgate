import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectCycles } from '../../../scripts/verify-no-circular-deps.js';

describe('PHASE 0.3 — Monorepo Setup & Architecture Validation', () => {
  const root = resolve(__dirname, '../../..');

  it('should verify all required directory branches exist', () => {
    const requiredDirs = [
      'apps/dashboard',
      'apps/control-api',
      'apps/distribution-api',
      'packages/contracts',
      'packages/evaluation-engine',
      'packages/config-model',
      'packages/hashing',
      'packages/rollout-engine',
      'packages/rule-engine',
      'packages/config-client',
      'sdks/javascript',
      'sdks/node',
      'sdks/flutter',
      'tests/integration',
      'tests/contract',
      'tests/compatibility',
      'tests/load',
      'infrastructure/docker',
      'infrastructure/database',
      'infrastructure/deployment',
      'docs/architecture',
      'docs/decisions',
      'docs/api',
      'docs/sdk',
      'docs/operations',
      'scripts',
    ];

    for (const dir of requiredDirs) {
      expect(existsSync(resolve(root, dir)), `Missing required directory: ${dir}`).toBe(true);
    }
  });

  it('should verify all root project definition files exist', () => {
    const rootFiles = [
      'project.txt',
      'phase.txt',
      'README.md',
      'CONTRIBUTING.md',
      'SECURITY.md',
      'LICENSE',
      'pnpm-workspace.yaml',
      'package.json',
      'tsconfig.base.json',
      'tsconfig.json',
    ];

    for (const file of rootFiles) {
      expect(existsSync(resolve(root, file)), `Missing required root file: ${file}`).toBe(true);
    }
  });

  it('should verify zero circular dependencies across the entire monorepo DAG', () => {
    const { hasCycle, cyclePath } = detectCycles();
    expect(hasCycle, `Circular dependency found: ${cyclePath.join(' -> ')}`).toBe(false);
  });
});
