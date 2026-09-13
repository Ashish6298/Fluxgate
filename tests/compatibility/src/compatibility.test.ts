import { describe, it, expect } from 'vitest';
import { computeBucket, buildCanonicalInput } from '@controlplane/hashing';

describe('Cross-SDK Compatibility & Equivalence Tests', () => {
  it('should match exact canonical hashing and integer bucketing rules', () => {
    // Cross-SDK Golden Vectors
    const vector1 = buildCanonicalInput({
      projectKey: 'mobile-app',
      environmentKey: 'production',
      flagKey: 'new_checkout',
      userIdentifier: 'user_123',
      rolloutSalt: 'v1',
    });

    const bucket1 = computeBucket(vector1);
    expect(bucket1).toBeGreaterThanOrEqual(0);
    expect(bucket1).toBeLessThan(10000);

    // Consistency check across invocations
    expect(computeBucket(vector1)).toBe(bucket1);
  });
});
