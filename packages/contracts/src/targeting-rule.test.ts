import { describe, it, expect } from 'vitest';
import {
  TargetingRuleSchema,
  TargetingRuleIdSchema,
  RuleConditionSchema,
  RuleOperatorSchema,
  CreateTargetingRuleInputSchema,
  UpdateTargetingRuleInputSchema,
} from './index.js';

describe('Targeting Rule Contracts & Validation', () => {
  const validFlagId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  const validRuleId = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

  it('validates a valid TargetingRule entity schema', () => {
    const validRule = {
      id: validRuleId,
      featureFlagId: validFlagId,
      priority: 0,
      conditions: [
        {
          attribute: 'platform',
          operator: 'EQUALS',
          value: 'android',
        },
        {
          attribute: 'country',
          operator: 'EQUALS',
          value: 'IN',
        },
      ],
      value: true,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = TargetingRuleSchema.safeParse(validRule);
    expect(result.success).toBe(true);
  });

  it('validates rule operators and condition formats', () => {
    expect(RuleOperatorSchema.safeParse('EQUALS').success).toBe(true);
    expect(RuleOperatorSchema.safeParse('IN').success).toBe(true);
    expect(RuleOperatorSchema.safeParse('GREATER_THAN').success).toBe(true);
    expect(RuleOperatorSchema.safeParse('UNKNOWN_OP').success).toBe(false);

    const condition = {
      attribute: 'appVersion',
      operator: 'GREATER_THAN_OR_EQUAL',
      value: '2.5.0',
    };
    expect(RuleConditionSchema.safeParse(condition).success).toBe(true);

    const emptyAttr = {
      attribute: '',
      operator: 'EQUALS',
      value: 'test',
    };
    expect(RuleConditionSchema.safeParse(emptyAttr).success).toBe(false);
  });

  it('validates UUIDs for id and featureFlagId', () => {
    expect(TargetingRuleIdSchema.safeParse(validRuleId).success).toBe(true);
    expect(TargetingRuleIdSchema.safeParse('not-a-uuid').success).toBe(false);
  });

  it('rejects rules with empty conditions or negative priority', () => {
    const emptyConditions = {
      id: validRuleId,
      featureFlagId: validFlagId,
      priority: 0,
      conditions: [],
      value: true,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(TargetingRuleSchema.safeParse(emptyConditions).success).toBe(false);

    const negativePriority = {
      ...emptyConditions,
      conditions: [{ attribute: 'country', operator: 'EQUALS', value: 'US' }],
      priority: -1,
    };
    expect(TargetingRuleSchema.safeParse(negativePriority).success).toBe(false);
  });

  it('validates CreateTargetingRuleInputSchema with defaults and UpdateTargetingRuleInputSchema', () => {
    const createInput = {
      featureFlagId: validFlagId,
      conditions: [
        { attribute: 'platform', operator: 'EQUALS', value: 'android' },
        { attribute: 'country', operator: 'EQUALS', value: 'IN' },
      ],
      value: true,
    };
    const parsed = CreateTargetingRuleInputSchema.safeParse(createInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.priority).toBe(0);
      expect(parsed.data.enabled).toBe(true);
    }

    const updateInput = {
      priority: 2,
      enabled: false,
      value: false,
    };
    expect(UpdateTargetingRuleInputSchema.safeParse(updateInput).success).toBe(true);
  });
});
