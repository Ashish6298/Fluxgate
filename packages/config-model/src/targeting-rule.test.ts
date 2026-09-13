import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTargetingRule,
  updateTargetingRule,
  InMemoryTargetingRuleRepository,
} from './index.js';

describe('TargetingRule Domain Model & Repository', () => {
  const flagId1 = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const flagId2 = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  describe('createTargetingRule factory helper', () => {
    it('creates a targeting rule with defaults and valid schema', () => {
      const rule = createTargetingRule({
        featureFlagId: flagId1,
        conditions: [
          { attribute: 'platform', operator: 'EQUALS', value: 'android' },
          { attribute: 'country', operator: 'EQUALS', value: 'IN' },
        ],
        value: true,
      });

      expect(rule.id).toBeDefined();
      expect(rule.featureFlagId).toBe(flagId1);
      expect(rule.priority).toBe(0);
      expect(rule.conditions).toHaveLength(2);
      expect(rule.value).toBe(true);
      expect(rule.enabled).toBe(true);
      expect(rule.createdAt).toBeDefined();
      expect(rule.updatedAt).toBe(rule.createdAt);
    });

    it('creates a targeting rule with explicit priority, value, and timestamp', () => {
      const explicitId = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
      const explicitTime = '2026-09-01T12:00:00.000Z';
      const rule = createTargetingRule({
        id: explicitId,
        featureFlagId: flagId1,
        priority: 5,
        conditions: [{ attribute: 'userId', operator: 'IN', value: ['u1', 'u2'] }],
        value: 'special_treatment',
        enabled: false,
        now: explicitTime,
      });

      expect(rule.id).toBe(explicitId);
      expect(rule.priority).toBe(5);
      expect(rule.value).toBe('special_treatment');
      expect(rule.enabled).toBe(false);
      expect(rule.createdAt).toBe(explicitTime);
      expect(rule.updatedAt).toBe(explicitTime);
    });

    it('rejects invalid inputs during creation', () => {
      expect(() =>
        createTargetingRule({
          featureFlagId: 'invalid-uuid',
          conditions: [{ attribute: 'platform', operator: 'EQUALS', value: 'ios' }],
          value: true,
        }),
      ).toThrow();

      expect(() =>
        createTargetingRule({
          featureFlagId: flagId1,
          conditions: [],
          value: true,
        }),
      ).toThrow();
    });
  });

  describe('updateTargetingRule helper', () => {
    it('immutably updates targeting rule fields and increments updatedAt', () => {
      const original = createTargetingRule({
        featureFlagId: flagId1,
        priority: 1,
        conditions: [{ attribute: 'country', operator: 'EQUALS', value: 'US' }],
        value: false,
        now: '2026-09-01T10:00:00.000Z',
      });

      const updatedTime = '2026-09-01T11:00:00.000Z';
      const updated = updateTargetingRule(
        original,
        {
          priority: 0,
          value: true,
          enabled: false,
        },
        updatedTime,
      );

      expect(updated.id).toBe(original.id);
      expect(updated.featureFlagId).toBe(original.featureFlagId);
      expect(updated.priority).toBe(0);
      expect(updated.value).toBe(true);
      expect(updated.enabled).toBe(false);
      expect(updated.updatedAt).toBe(updatedTime);

      // Verify immutability
      expect(original.priority).toBe(1);
      expect(original.value).toBe(false);
      expect(original.enabled).toBe(true);
    });
  });

  describe('InMemoryTargetingRuleRepository', () => {
    let repo: InMemoryTargetingRuleRepository;

    beforeEach(() => {
      repo = new InMemoryTargetingRuleRepository();
    });

    it('creates, retrieves, and lists rules ordered by priority', async () => {
      const ruleP2 = await repo.create({
        featureFlagId: flagId1,
        priority: 2,
        conditions: [{ attribute: 'country', operator: 'EQUALS', value: 'GB' }],
        value: 'uk_variant',
      });
      const ruleP0 = await repo.create({
        featureFlagId: flagId1,
        priority: 0,
        conditions: [{ attribute: 'userId', operator: 'EQUALS', value: 'admin' }],
        value: 'admin_variant',
      });
      const ruleP1 = await repo.create({
        featureFlagId: flagId1,
        priority: 1,
        conditions: [{ attribute: 'platform', operator: 'EQUALS', value: 'android' }],
        value: 'android_variant',
      });
      const ruleOtherFlag = await repo.create({
        featureFlagId: flagId2,
        priority: 0,
        conditions: [{ attribute: 'country', operator: 'EQUALS', value: 'IN' }],
        value: true,
      });

      expect(await repo.findById(ruleP0.id)).toEqual(ruleP0);

      const flag1Rules = await repo.listByFeatureFlag(flagId1);
      expect(flag1Rules).toHaveLength(3);
      // Verify ascending priority order
      expect(flag1Rules[0]?.id).toBe(ruleP0.id);
      expect(flag1Rules[1]?.id).toBe(ruleP1.id);
      expect(flag1Rules[2]?.id).toBe(ruleP2.id);

      const flag2Rules = await repo.listByFeatureFlag(flagId2);
      expect(flag2Rules).toHaveLength(1);
      expect(flag2Rules[0]?.id).toBe(ruleOtherFlag.id);
    });

    it('enforces global rule ID uniqueness', async () => {
      const explicitId = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
      await repo.create(
        {
          featureFlagId: flagId1,
          conditions: [{ attribute: 'platform', operator: 'EQUALS', value: 'web' }],
          value: true,
        },
        explicitId,
      );

      await expect(
        repo.create(
          {
            featureFlagId: flagId2,
            conditions: [{ attribute: 'platform', operator: 'EQUALS', value: 'ios' }],
            value: false,
          },
          explicitId,
        ),
      ).rejects.toThrow(/already exists/);
    });

    it('updates and deletes targeting rules', async () => {
      const rule = await repo.create({
        featureFlagId: flagId1,
        conditions: [{ attribute: 'platform', operator: 'EQUALS', value: 'web' }],
        value: true,
      });

      const updated = await repo.update(rule.id, { enabled: false, value: 'updated_val' });
      expect(updated.enabled).toBe(false);
      expect(updated.value).toBe('updated_val');

      const deleted = await repo.delete(rule.id);
      expect(deleted).toBe(true);
      expect(await repo.findById(rule.id)).toBeNull();
      expect(await repo.listByFeatureFlag(flagId1)).toHaveLength(0);
    });
  });
});
