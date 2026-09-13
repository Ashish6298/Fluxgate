import { describe, it, expect } from 'vitest';
import {
  RolloutSchema,
  CreateRolloutInputSchema,
  UpdateRolloutInputSchema,
  RolloutIdSchema,
  RolloutPercentageSchema,
  RolloutSaltSchema,
} from './index.js';

describe('Rollout Domain Model Contract (Phase 1.6)', () => {
  const validFeatureFlagId = '123e4567-e89b-12d3-a456-426614174000';
  const validRolloutId = '987fcdeb-51a2-43d7-9876-543210987654';

  describe('Field Schemas', () => {
    it('validates UUID format for Rollout ID', () => {
      expect(RolloutIdSchema.safeParse(validRolloutId).success).toBe(true);
      expect(RolloutIdSchema.safeParse('invalid-uuid').success).toBe(false);
    });

    it('validates percentage bounds [0, 100]', () => {
      expect(RolloutPercentageSchema.safeParse(0).success).toBe(true);
      expect(RolloutPercentageSchema.safeParse(25).success).toBe(true);
      expect(RolloutPercentageSchema.safeParse(50.5).success).toBe(true);
      expect(RolloutPercentageSchema.safeParse(100).success).toBe(true);

      expect(RolloutPercentageSchema.safeParse(-1).success).toBe(false);
      expect(RolloutPercentageSchema.safeParse(100.1).success).toBe(false);
      expect(RolloutPercentageSchema.safeParse('25').success).toBe(false);
    });

    it('validates non-empty salt strings', () => {
      expect(RolloutSaltSchema.safeParse('v1').success).toBe(true);
      expect(RolloutSaltSchema.safeParse('custom-salt-2026').success).toBe(true);
      expect(RolloutSaltSchema.safeParse('').success).toBe(false);
      expect(RolloutSaltSchema.safeParse('   ').success).toBe(false);
    });
  });

  describe('RolloutSchema', () => {
    it('validates complete, correct rollout entity', () => {
      const validRollout = {
        id: validRolloutId,
        featureFlagId: validFeatureFlagId,
        percentage: 25,
        salt: 'v1',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = RolloutSchema.safeParse(validRollout);
      expect(result.success).toBe(true);
    });

    it('rejects invalid rollout entities', () => {
      const invalidRollout = {
        id: 'invalid-id',
        featureFlagId: validFeatureFlagId,
        percentage: 150,
        salt: '',
        enabled: 'not-a-bool',
        createdAt: 'invalid-date',
        updatedAt: 'invalid-date',
      };

      const result = RolloutSchema.safeParse(invalidRollout);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateRolloutInputSchema', () => {
    it('applies default values for salt (v1) and enabled (true)', () => {
      const input = {
        featureFlagId: validFeatureFlagId,
        percentage: 25,
      };

      const parsed = CreateRolloutInputSchema.parse(input);
      expect(parsed.salt).toBe('v1');
      expect(parsed.enabled).toBe(true);
      expect(parsed.percentage).toBe(25);
    });

    it('allows overriding salt and enabled state', () => {
      const input = {
        featureFlagId: validFeatureFlagId,
        percentage: 10,
        salt: 'canary-v2',
        enabled: false,
      };

      const parsed = CreateRolloutInputSchema.parse(input);
      expect(parsed.salt).toBe('canary-v2');
      expect(parsed.enabled).toBe(false);
      expect(parsed.percentage).toBe(10);
    });
  });

  describe('UpdateRolloutInputSchema', () => {
    it('allows partial updates to percentage, salt, and enabled', () => {
      expect(UpdateRolloutInputSchema.safeParse({ percentage: 50 }).success).toBe(true);
      expect(UpdateRolloutInputSchema.safeParse({ salt: 'v2' }).success).toBe(true);
      expect(UpdateRolloutInputSchema.safeParse({ enabled: false }).success).toBe(true);
      expect(
        UpdateRolloutInputSchema.safeParse({ percentage: 75, salt: 'v3', enabled: true }).success,
      ).toBe(true);
    });

    it('rejects invalid update values', () => {
      expect(UpdateRolloutInputSchema.safeParse({ percentage: 105 }).success).toBe(false);
      expect(UpdateRolloutInputSchema.safeParse({ salt: '' }).success).toBe(false);
    });
  });
});
