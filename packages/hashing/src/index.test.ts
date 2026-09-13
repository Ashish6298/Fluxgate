import { describe, it, expect } from 'vitest';
import { buildCanonicalInput, computeBucket } from './index.js';

describe('Hashing Package', () => {
  it('should build deterministic canonical input string', () => {
    const input = buildCanonicalInput({
      projectKey: 'mobile-app',
      environmentKey: 'production',
      flagKey: 'new_checkout',
      userIdentifier: 'user_123',
      rolloutSalt: 'v1',
    });
    expect(input).toBe('mobile-app:production:new_checkout:user_123:v1');
  });

  it('should compute deterministic bucket within [0, 9999]', () => {
    const input = 'mobile-app:production:new_checkout:user_123:v1';
    const bucket1 = computeBucket(input);
    const bucket2 = computeBucket(input);

    expect(bucket1).toBe(bucket2);
    expect(bucket1).toBeGreaterThanOrEqual(0);
    expect(bucket1).toBeLessThan(10000);
  });
});
