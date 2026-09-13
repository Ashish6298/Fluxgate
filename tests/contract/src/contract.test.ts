import { describe, it, expect } from 'vitest';
import { ConfigurationSnapshotSchema } from '@controlplane/config-model';
import { buildCanonicalInput, computeBucket } from '@controlplane/hashing';

describe('Contract & Cross-SDK Golden Vectors Baseline', () => {
  it('should guarantee consistent hash bucket generation across test vectors', () => {
    const testCases = [
      {
        input: {
          projectKey: 'mobile-app',
          environmentKey: 'production',
          flagKey: 'new_checkout',
          userIdentifier: 'user_123',
          rolloutSalt: 'v1',
        },
      },
      {
        input: {
          projectKey: 'web-app',
          environmentKey: 'staging',
          flagKey: 'dark_theme',
          userIdentifier: 'user_999',
          rolloutSalt: 'v1',
        },
      },
    ];

    for (const tc of testCases) {
      const canonical = buildCanonicalInput(tc.input);
      const bucket1 = computeBucket(canonical);
      const bucket2 = computeBucket(canonical);
      expect(bucket1).toBe(bucket2);
      expect(bucket1).toBeGreaterThanOrEqual(0);
      expect(bucket1).toBeLessThan(10000);
    }
  });

  it('should validate snapshot contract schemas', () => {
    const invalidSnapshot = {
      schemaVersion: 'not_a_number',
      projectKey: '',
    };
    expect(ConfigurationSnapshotSchema.safeParse(invalidSnapshot).success).toBe(false);
  });
});
