import { describe, it, expect, beforeEach } from 'vitest';
import { createFeatureFlag, updateFeatureFlag, InMemoryFeatureFlagRepository } from './index.js';

describe('FeatureFlag Domain Model & Repository', () => {
  const envId1 = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const envId2 = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  describe('createFeatureFlag factory helper', () => {
    it('creates a boolean feature flag with defaults and valid schema', () => {
      const flag = createFeatureFlag({
        environmentId: envId1,
        key: 'new_checkout',
        name: 'New Checkout Flow',
        type: 'BOOLEAN',
        defaultValue: false,
      });

      expect(flag.id).toBeDefined();
      expect(flag.environmentId).toBe(envId1);
      expect(flag.key).toBe('new_checkout');
      expect(flag.name).toBe('New Checkout Flow');
      expect(flag.type).toBe('BOOLEAN');
      expect(flag.defaultValue).toBe(false);
      expect(flag.enabled).toBe(true);
      expect(flag.createdAt).toBeDefined();
      expect(flag.updatedAt).toBe(flag.createdAt);
    });

    it('creates feature flags across String, Number, and JSON types', () => {
      const stringFlag = createFeatureFlag({
        environmentId: envId1,
        key: 'hero_title',
        name: 'Hero Title',
        type: 'STRING',
        defaultValue: 'Welcome',
      });
      expect(stringFlag.defaultValue).toBe('Welcome');

      const numberFlag = createFeatureFlag({
        environmentId: envId1,
        key: 'max_items',
        name: 'Max Items',
        type: 'NUMBER',
        defaultValue: 50,
      });
      expect(numberFlag.defaultValue).toBe(50);

      const jsonFlag = createFeatureFlag({
        environmentId: envId1,
        key: 'tier_config',
        name: 'Tier Config',
        type: 'JSON',
        defaultValue: { plan: 'pro', limit: 1000 },
      });
      expect(jsonFlag.defaultValue).toEqual({ plan: 'pro', limit: 1000 });
    });

    it('rejects type mismatches during creation', () => {
      expect(() =>
        createFeatureFlag({
          environmentId: envId1,
          key: 'invalid_flag',
          name: 'Invalid',
          type: 'BOOLEAN',
          defaultValue: 'not-a-bool',
        }),
      ).toThrow();
    });
  });

  describe('updateFeatureFlag helper', () => {
    it('immutably updates feature flag attributes and increments updatedAt', () => {
      const original = createFeatureFlag({
        environmentId: envId1,
        key: 'dark_mode',
        name: 'Dark Mode',
        type: 'BOOLEAN',
        defaultValue: false,
        enabled: false,
        now: '2026-09-01T10:00:00.000Z',
      });

      const updatedTime = '2026-09-01T11:00:00.000Z';
      const updated = updateFeatureFlag(
        original,
        {
          name: 'Dark Mode Global',
          defaultValue: true,
          enabled: true,
        },
        updatedTime,
      );

      expect(updated.id).toBe(original.id);
      expect(updated.environmentId).toBe(original.environmentId);
      expect(updated.key).toBe(original.key);
      expect(updated.name).toBe('Dark Mode Global');
      expect(updated.defaultValue).toBe(true);
      expect(updated.enabled).toBe(true);
      expect(updated.updatedAt).toBe(updatedTime);

      // Verify immutability
      expect(original.name).toBe('Dark Mode');
      expect(original.defaultValue).toBe(false);
      expect(original.enabled).toBe(false);
    });

    it('rejects update if new defaultValue does not match flag type', () => {
      const flag = createFeatureFlag({
        environmentId: envId1,
        key: 'int_flag',
        name: 'Int Flag',
        type: 'NUMBER',
        defaultValue: 10,
      });

      expect(() =>
        updateFeatureFlag(flag, {
          defaultValue: 'string-val',
        }),
      ).toThrow();
    });
  });

  describe('InMemoryFeatureFlagRepository', () => {
    let repo: InMemoryFeatureFlagRepository;

    beforeEach(() => {
      repo = new InMemoryFeatureFlagRepository();
    });

    it('creates, retrieves, and lists flags by environment', async () => {
      const f1 = await repo.create({
        environmentId: envId1,
        key: 'flag_one',
        name: 'Flag One',
        type: 'BOOLEAN',
        defaultValue: true,
      });
      const f2 = await repo.create({
        environmentId: envId1,
        key: 'flag_two',
        name: 'Flag Two',
        type: 'STRING',
        defaultValue: 'v1',
      });
      const otherEnvFlag = await repo.create({
        environmentId: envId2,
        key: 'flag_one',
        name: 'Flag One Env 2',
        type: 'BOOLEAN',
        defaultValue: false,
      });

      expect(await repo.findById(f1.id)).toEqual(f1);
      expect(await repo.findByKey(envId1, 'flag_one')).toEqual(f1);

      const env1Flags = await repo.listByEnvironment(envId1);
      expect(env1Flags).toHaveLength(2);
      expect(env1Flags.map((f) => f.id)).toContain(f1.id);
      expect(env1Flags.map((f) => f.id)).toContain(f2.id);

      const env2Flags = await repo.listByEnvironment(envId2);
      expect(env2Flags).toHaveLength(1);
      expect(env2Flags[0]?.id).toBe(otherEnvFlag.id);
    });

    it('enforces flag key uniqueness within the same environment', async () => {
      await repo.create({
        environmentId: envId1,
        key: 'duplicate_key',
        name: 'Flag A',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      await expect(
        repo.create({
          environmentId: envId1,
          key: 'duplicate_key',
          name: 'Flag B',
          type: 'BOOLEAN',
          defaultValue: false,
        }),
      ).rejects.toThrow(/already exists in environment/);
    });

    it('allows same flag key across different environments', async () => {
      const f1 = await repo.create({
        environmentId: envId1,
        key: 'new_checkout',
        name: 'Checkout Dev',
        type: 'BOOLEAN',
        defaultValue: true,
      });

      const f2 = await repo.create({
        environmentId: envId2,
        key: 'new_checkout',
        name: 'Checkout Prod',
        type: 'BOOLEAN',
        defaultValue: false,
      });

      expect(f1.key).toBe(f2.key);
      expect(f1.defaultValue).toBe(true);
      expect(f2.defaultValue).toBe(false);
      expect(await repo.findByKey(envId1, 'new_checkout')).toEqual(f1);
      expect(await repo.findByKey(envId2, 'new_checkout')).toEqual(f2);
    });

    it('updates and deletes feature flags', async () => {
      const flag = await repo.create({
        environmentId: envId1,
        key: 'kill_switch',
        name: 'Kill Switch',
        type: 'BOOLEAN',
        defaultValue: false,
      });

      const updated = await repo.update(flag.id, { enabled: false });
      expect(updated.enabled).toBe(false);

      const deleted = await repo.delete(flag.id);
      expect(deleted).toBe(true);
      expect(await repo.findById(flag.id)).toBeNull();
      expect(await repo.findByKey(envId1, 'kill_switch')).toBeNull();
    });
  });
});
