import { describe, it, expect } from 'vitest';
import {
  TargetingRuleSchema,
  TargetingRuleIdSchema,
  createTargetingRule,
  InMemoryTargetingRuleRepository,
} from '@controlplane/config-model';
import { evaluateRules } from '@controlplane/rule-engine';

describe('Phase 1.5 Milestone Contract — Targeting Rule', () => {
  const flagId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  it('adheres to the exact TargetingRule model specification', () => {
    const rule = createTargetingRule({
      featureFlagId: flagId,
      priority: 0,
      conditions: [
        { attribute: 'platform', operator: 'EQUALS', value: 'android' },
        { attribute: 'country', operator: 'EQUALS', value: 'IN' },
      ],
      value: true,
      enabled: true,
    });

    const parsed = TargetingRuleSchema.parse(rule);
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('featureFlagId', flagId);
    expect(parsed).toHaveProperty('priority', 0);
    expect(parsed).toHaveProperty('conditions');
    expect(parsed.conditions).toHaveLength(2);
    expect(parsed).toHaveProperty('value', true);
    expect(parsed).toHaveProperty('enabled', true);
    expect(parsed).toHaveProperty('createdAt');
    expect(parsed).toHaveProperty('updatedAt');

    expect(TargetingRuleIdSchema.safeParse(parsed.id).success).toBe(true);
  });

  it('evaluates example rule: IF platform == android AND country == IN THEN true', () => {
    const rule = createTargetingRule({
      featureFlagId: flagId,
      priority: 0,
      conditions: [
        { attribute: 'platform', operator: 'equals', value: 'android' },
        { attribute: 'country', operator: 'equals', value: 'IN' },
      ],
      value: true,
      enabled: true,
    });

    // 1. Matching context (Android + India) -> Match
    const matchContext = {
      userId: 'user_123',
      platform: 'android',
      country: 'IN',
    };
    const matchResult = evaluateRules([rule], matchContext);
    expect(matchResult).not.toBeNull();
    expect(matchResult?.value).toBe(true);

    // 2. Non-matching country (Android + US) -> No Match
    const wrongCountryContext = {
      userId: 'user_456',
      platform: 'android',
      country: 'US',
    };
    expect(evaluateRules([rule], wrongCountryContext)).toBeNull();

    // 3. Non-matching platform (iOS + India) -> No Match
    const wrongPlatformContext = {
      userId: 'user_789',
      platform: 'ios',
      country: 'IN',
    };
    expect(evaluateRules([rule], wrongPlatformContext)).toBeNull();
  });

  it('guarantees priority-based deterministic evaluation across multiple rules', async () => {
    const repo = new InMemoryTargetingRuleRepository();

    // Rule 1 (Higher Priority = 0): VIP users in India get 50% discount
    const vipRule = await repo.create({
      featureFlagId: flagId,
      priority: 0,
      conditions: [
        { attribute: 'userId', operator: 'equals', value: 'vip_user' },
        { attribute: 'country', operator: 'equals', value: 'IN' },
      ],
      value: 'discount_50',
    });

    // Rule 2 (Lower Priority = 1): All users in India get 10% discount
    const genericIndiaRule = await repo.create({
      featureFlagId: flagId,
      priority: 1,
      conditions: [{ attribute: 'country', operator: 'equals', value: 'IN' }],
      value: 'discount_10',
    });

    expect(vipRule.priority).toBeLessThan(genericIndiaRule.priority);

    const rules = await repo.listByFeatureFlag(flagId);

    // Evaluation for VIP user in India matches Rule 0 (50% discount) first
    const vipEvaluation = evaluateRules(rules, { userId: 'vip_user', country: 'IN' });
    expect(vipEvaluation?.value).toBe('discount_50');

    // Evaluation for regular user in India matches Rule 1 (10% discount)
    const regularEvaluation = evaluateRules(rules, { userId: 'regular_user', country: 'IN' });
    expect(regularEvaluation?.value).toBe('discount_10');
  });
});
