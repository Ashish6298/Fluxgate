import { describe, it, expect } from 'vitest';
import { evaluateFlag } from './index.js';

describe('Evaluation Engine Package', () => {
  const mockSnapshot = {
    schemaVersion: 1,
    projectKey: 'app',
    environmentKey: 'prod',
    configurationVersion: 10,
    checksum: 'checksum_mock',
    flags: [
      {
        id: 'f1',
        key: 'dark_mode',
        name: 'Dark Mode',
        type: 'BOOLEAN' as const,
        defaultValue: true,
        enabled: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
  };

  it('should return safe default for unknown flags', () => {
    const res = evaluateFlag({
      snapshot: mockSnapshot,
      flagKey: 'non_existent',
      context: { userId: 'u1' },
      defaultValue: 'fallback',
    });
    expect(res.reason).toBe('UNKNOWN_FLAG');
    expect(res.value).toBe('fallback');
  });

  it('should return flag default when enabled without rules', () => {
    const res = evaluateFlag({
      snapshot: mockSnapshot,
      flagKey: 'dark_mode',
      context: { userId: 'u1' },
    });
    expect(res.reason).toBe('DEFAULT');
    expect(res.value).toBe(true);
  });
});
