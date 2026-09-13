import { describe, it, expect } from 'vitest';
import { evaluateRules } from './index.js';

describe('Rule Engine Package', () => {
  it('should evaluate rules by priority order', () => {
    const rules = [
      {
        id: 'rule_beta',
        priority: 2,
        enabled: true,
        conditions: [{ attribute: 'country', operator: 'equals', value: 'IN' }],
        value: 'beta_version',
      },
      {
        id: 'rule_admin',
        priority: 1,
        enabled: true,
        conditions: [{ attribute: 'userId', operator: 'equals', value: 'admin_1' }],
        value: 'admin_version',
      },
    ];

    const match = evaluateRules(rules, { userId: 'admin_1', country: 'IN' });
    expect(match?.id).toBe('rule_admin');
    expect(match?.value).toBe('admin_version');
  });
});
