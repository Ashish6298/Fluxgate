import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PHASE 0.5 — CI Foundation Verification', () => {
  const root = resolve(__dirname, '../../..');
  const ciWorkflowPath = resolve(root, '.github/workflows/ci.yml');
  const ciDocPath = resolve(root, 'docs/operations/ci-pipeline.md');

  it('should verify CI workflow configuration file exists and contains all required stages', () => {
    expect(existsSync(ciWorkflowPath)).toBe(true);
    const content = readFileSync(ciWorkflowPath, 'utf8');

    expect(content).toContain('name: CI Pipeline');
    expect(content).toContain('pnpm run format:check');
    expect(content).toContain('pnpm run lint');
    expect(content).toContain('pnpm run typecheck');
    expect(content).toContain('pnpm run test');
    expect(content).toContain('pnpm run build');
    expect(content).toContain('--frozen-lockfile');

    // Verify pipeline ordering in YAML
    const formatIndex = content.indexOf('format:check');
    const lintIndex = content.indexOf('lint');
    const typecheckIndex = content.indexOf('typecheck');
    const testIndex = content.indexOf('pnpm run test');
    const buildIndex = content.indexOf('pnpm run build');

    expect(formatIndex).toBeLessThan(lintIndex);
    expect(lintIndex).toBeLessThan(typecheckIndex);
    expect(typecheckIndex).toBeLessThan(testIndex);
    expect(testIndex).toBeLessThan(buildIndex);
  });

  it('should verify CI documentation exists and specifies failure conditions', () => {
    expect(existsSync(ciDocPath)).toBe(true);
    const content = readFileSync(ciDocPath, 'utf8');

    expect(content).toContain('Failing Tests Fail CI');
    expect(content).toContain('Type Errors Fail CI');
    expect(content).toContain('Lint Errors Fail CI');
    expect(content).toContain('Format Violations Fail CI');
  });
});
