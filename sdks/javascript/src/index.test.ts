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
            id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
            environmentId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
            key: 'new_feature',
            name: 'New Feature',
            type: 'BOOLEAN' as const,
            defaultValue: true,
            enabled: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    });

    expect(cp.isEnabled('new_feature')).toBe(true);
    expect(cp.isEnabled('unknown_flag', {}, false)).toBe(false);
  });
});
