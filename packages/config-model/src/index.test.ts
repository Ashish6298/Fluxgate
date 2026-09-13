import { describe, it, expect } from 'vitest';
import { ConfigurationSnapshotSchema } from './index.js';

describe('Config Model Package', () => {
  it('should validate valid configuration snapshot', () => {
    const snapshot = {
      schemaVersion: 1,
      projectKey: 'mobile-app',
      environmentKey: 'production',
      configurationVersion: 42,
      checksum: 'sha256_mock_abc123',
      flags: [
        {
          id: 'flag_1',
          key: 'new_checkout',
          name: 'New Checkout Flow',
          type: 'BOOLEAN' as const,
          defaultValue: false,
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    expect(ConfigurationSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });
});
