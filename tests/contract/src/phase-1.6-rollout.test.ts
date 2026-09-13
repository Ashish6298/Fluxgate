import { describe, it, expect } from 'vitest';
import {
  RolloutSchema,
  createRollout,
  InMemoryRolloutRepository,
} from '@controlplane/config-model';
import { isUserInRollout } from '@controlplane/rollout-engine';
import { buildCanonicalInput, computeBucket } from '@controlplane/hashing';

describe('PHASE 1.6 — Rollout Contract & Specification Conformance', () => {
  const dummyFlagId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

  it('adheres to Phase 1.6 Rollout model specification', () => {
    const rollout = createRollout({
      featureFlagId: dummyFlagId,
      percentage: 25,
      salt: 'v1',
      enabled: true,
    });

    // Verify presence of all required fields from phase.txt
    expect(rollout).toHaveProperty('id');
    expect(rollout).toHaveProperty('featureFlagId', dummyFlagId);
    expect(rollout).toHaveProperty('percentage', 25);
    expect(rollout).toHaveProperty('salt', 'v1');
    expect(rollout).toHaveProperty('enabled', true);

    const validated = RolloutSchema.safeParse(rollout);
    expect(validated.success).toBe(true);
  });

  it('implements the exact specification example: new_checkout with 25% rollout', async () => {
    const repo = new InMemoryRolloutRepository();
    const flagKey = 'new_checkout';
    const projectKey = 'mobile-app';
    const envKey = 'production';

    // Create 25% rollout for new_checkout
    const rollout = await repo.create({
      featureFlagId: dummyFlagId,
      percentage: 25,
      salt: 'v1',
      enabled: true,
    });

    expect(rollout.percentage).toBe(25);
    expect(rollout.enabled).toBe(true);

    // Test deterministic evaluation across users
    const testUsers = Array.from({ length: 500 }, (_, i) => `user_${i}`);
    let enabledCount = 0;

    for (const userId of testUsers) {
      const canonical = buildCanonicalInput({
        projectKey,
        environmentKey: envKey,
        flagKey,
        userIdentifier: userId,
        rolloutSalt: rollout.salt,
      });

      const bucket = computeBucket(canonical);
      const evalResult = isUserInRollout({
        projectKey,
        environmentKey: envKey,
        flagKey,
        userIdentifier: userId,
        rolloutSalt: rollout.salt,
        percentage: rollout.percentage,
      });

      // Threshold for 25% must be 2500 out of 10000 buckets
      expect(evalResult.threshold).toBe(2500);
      expect(evalResult.bucket).toBe(bucket);
      expect(evalResult.inRollout).toBe(bucket < 2500);

      if (evalResult.inRollout) {
        enabledCount++;
      }
    }

    // With 500 uniformly distributed hashes, 25% should be approximately 20%-30%
    const ratio = enabledCount / testUsers.length;
    expect(ratio).toBeGreaterThan(0.18);
    expect(ratio).toBeLessThan(0.32);
  });

  it('guarantees stability: users included at 25% remain included at 50%', async () => {
    const flagKey = 'new_checkout';
    const projectKey = 'mobile-app';
    const envKey = 'production';
    const salt = 'v1';

    const testUsers = Array.from({ length: 200 }, (_, i) => `user_${i}`);
    const usersIn25Percent = new Set<string>();

    for (const userId of testUsers) {
      const res25 = isUserInRollout({
        projectKey,
        environmentKey: envKey,
        flagKey,
        userIdentifier: userId,
        rolloutSalt: salt,
        percentage: 25,
      });

      if (res25.inRollout) {
        usersIn25Percent.add(userId);
      }
    }

    // Now expand rollout to 50%
    for (const userId of testUsers) {
      const res50 = isUserInRollout({
        projectKey,
        environmentKey: envKey,
        flagKey,
        userIdentifier: userId,
        rolloutSalt: salt,
        percentage: 50,
      });

      if (usersIn25Percent.has(userId)) {
        // Every single user who was in 25% MUST be in 50%
        expect(res50.inRollout).toBe(true);
      }
    }
  });
});
