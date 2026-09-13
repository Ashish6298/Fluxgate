import { describe, it, expect } from 'vitest';
import { ControlPlane } from './index.js';

describe('JavaScript SDK Skeleton', () => {
  it('should initialize and evaluate flags', async () => {
    const cp = await ControlPlane.initialize({
      apiKey: 'sdk_key_mock_123',
      initialSnapshot: {
        schemaVersion: 1,
        projectKey: 'mobile-app',
        environmentKey: 'production',
        configurationVersion: 1,
        checksum: 'chk_123',
        flags: [
          {
            id: 'f1',
            key: 'new_feature',
            name: 'New Feature',
            type: 'BOOLEAN' as const,
            defaultValue: true,
            enabled: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
      },
    });

    expect(cp.isEnabled('new_feature')).toBe(true);
    expect(cp.isEnabled('unknown_flag', {}, false)).toBe(false);
  });
});
