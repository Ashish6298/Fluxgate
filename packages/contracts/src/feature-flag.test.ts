import { describe, it, expect } from 'vitest';
import {
  FeatureFlagSchema,
  FeatureFlagIdSchema,
  FeatureFlagKeySchema,
  FeatureFlagNameSchema,
  CreateFeatureFlagInputSchema,
  UpdateFeatureFlagInputSchema,
  isValidFlagValue,
} from './index.js';

describe('Feature Flag Contracts & Validation', () => {
  const validEnvId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const validFlagId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

  describe('Flag type & default value checking with isValidFlagValue', () => {
    it('validates BOOLEAN types', () => {
      expect(isValidFlagValue('BOOLEAN', true)).toBe(true);
      expect(isValidFlagValue('BOOLEAN', false)).toBe(true);
      expect(isValidFlagValue('BOOLEAN', 'true')).toBe(false);
      expect(isValidFlagValue('BOOLEAN', 1)).toBe(false);
    });

    it('validates STRING types', () => {
      expect(isValidFlagValue('STRING', 'dark-mode')).toBe(true);
      expect(isValidFlagValue('STRING', '')).toBe(true);
      expect(isValidFlagValue('STRING', 123)).toBe(false);
    });

    it('validates NUMBER types', () => {
      expect(isValidFlagValue('NUMBER', 42)).toBe(true);
      expect(isValidFlagValue('NUMBER', 3.1415)).toBe(true);
      expect(isValidFlagValue('NUMBER', 0)).toBe(true);
      expect(isValidFlagValue('NUMBER', NaN)).toBe(false);
      expect(isValidFlagValue('NUMBER', Infinity)).toBe(false);
      expect(isValidFlagValue('NUMBER', '42')).toBe(false);
    });

    it('validates JSON types', () => {
      expect(isValidFlagValue('JSON', { theme: 'dark', retries: 3 })).toBe(true);
      expect(isValidFlagValue('JSON', [1, 2, 'three'])).toBe(true);
      expect(isValidFlagValue('JSON', null)).toBe(true);
      expect(isValidFlagValue('JSON', 'json-string')).toBe(true);
      expect(isValidFlagValue('JSON', undefined)).toBe(false);
    });
  });

  describe('FeatureFlagSchema validation', () => {
    it('validates valid feature flags across all types', () => {
      const boolFlag = {
        id: validFlagId,
        environmentId: validEnvId,
        key: 'new_checkout',
        name: 'New Checkout Flow',
        description: 'Enables the React 19 checkout page',
        type: 'BOOLEAN',
        defaultValue: false,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(FeatureFlagSchema.safeParse(boolFlag).success).toBe(true);

      const stringFlag = {
        ...boolFlag,
        key: 'hero-banner-text',
        type: 'STRING',
        defaultValue: 'Welcome to ControlPlane',
      };
      expect(FeatureFlagSchema.safeParse(stringFlag).success).toBe(true);

      const numberFlag = {
        ...boolFlag,
        key: 'max_rate_limit_rpm',
        type: 'NUMBER',
        defaultValue: 600,
      };
      expect(FeatureFlagSchema.safeParse(numberFlag).success).toBe(true);

      const jsonFlag = {
        ...boolFlag,
        key: 'pricing-tier-config',
        type: 'JSON',
        defaultValue: { tier: 'enterprise', rateLimit: 10000, features: ['sso', 'audit'] },
      };
      expect(FeatureFlagSchema.safeParse(jsonFlag).success).toBe(true);
    });

    it('rejects type mismatches in defaultValue', () => {
      const mismatchedFlag = {
        id: validFlagId,
        environmentId: validEnvId,
        key: 'mismatched_flag',
        name: 'Mismatched',
        type: 'BOOLEAN',
        defaultValue: 'not-a-boolean',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(FeatureFlagSchema.safeParse(mismatchedFlag).success).toBe(false);
    });

    it('validates flag key formatting with hyphens and underscores', () => {
      expect(FeatureFlagKeySchema.safeParse('new_checkout').success).toBe(true);
      expect(FeatureFlagKeySchema.safeParse('new-checkout-v2').success).toBe(true);
      expect(FeatureFlagKeySchema.safeParse('feature_flag_99').success).toBe(true);

      expect(FeatureFlagKeySchema.safeParse('a').success).toBe(false); // < 2 chars
      expect(FeatureFlagKeySchema.safeParse('NewCheckout').success).toBe(false); // uppercase
      expect(FeatureFlagKeySchema.safeParse('-new-checkout').success).toBe(false); // leading hyphen
      expect(FeatureFlagKeySchema.safeParse('new-checkout-').success).toBe(false); // trailing hyphen
    });

    it('validates UUIDs for id and environmentId', () => {
      expect(FeatureFlagIdSchema.safeParse(validFlagId).success).toBe(true);
      expect(FeatureFlagIdSchema.safeParse('not-a-uuid').success).toBe(false);
    });

    it('validates and trims flag name', () => {
      expect(FeatureFlagNameSchema.safeParse('  New Checkout  ').data).toBe('New Checkout');
      expect(FeatureFlagNameSchema.safeParse('').success).toBe(false);
      expect(FeatureFlagNameSchema.safeParse('   ').success).toBe(false);
    });

    it('validates CreateFeatureFlagInputSchema and UpdateFeatureFlagInputSchema', () => {
      const createInput = {
        environmentId: validEnvId,
        key: 'new_checkout',
        name: 'New Checkout Flow',
        type: 'BOOLEAN',
        defaultValue: false,
      };
      const parsedCreate = CreateFeatureFlagInputSchema.safeParse(createInput);
      expect(parsedCreate.success).toBe(true);
      if (parsedCreate.success) {
        expect(parsedCreate.data.enabled).toBe(true); // default true
      }

      const updateInput = {
        name: 'Updated Flag Name',
        defaultValue: true,
        enabled: false,
      };
      expect(UpdateFeatureFlagInputSchema.safeParse(updateInput).success).toBe(true);
    });
  });
});
