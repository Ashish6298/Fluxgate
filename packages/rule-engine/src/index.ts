import type { EvaluationContext } from '@controlplane/contracts';

export type StringOperator =
  'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';

export interface Condition {
  attribute: string;
  operator: StringOperator | string;
  value: unknown;
}

export interface Rule {
  id: string;
  priority: number;
  conditions: Condition[];
  value: unknown;
  enabled: boolean;
}

export function evaluateCondition(condition: Condition, context: EvaluationContext): boolean {
  const contextRecord = context as Record<string, unknown>;
  const contextValue =
    contextRecord[condition.attribute] ?? context.customAttributes?.[condition.attribute];

  if (contextValue === undefined) {
    return false;
  }

  switch (condition.operator) {
    case 'equals':
      return String(contextValue) === String(condition.value);
    case 'notEquals':
      return String(contextValue) !== String(condition.value);
    case 'contains':
      return String(contextValue).includes(String(condition.value));
    case 'startsWith':
      return String(contextValue).startsWith(String(condition.value));
    case 'endsWith':
      return String(contextValue).endsWith(String(condition.value));
    case 'in':
      return (
        Array.isArray(condition.value) && condition.value.map(String).includes(String(contextValue))
      );
    case 'notIn':
      return (
        Array.isArray(condition.value) &&
        !condition.value.map(String).includes(String(contextValue))
      );
    default:
      return false;
  }
}

export function evaluateRules(rules: Rule[], context: EvaluationContext): Rule | null {
  const sorted = [...rules].filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    const matches = rule.conditions.every((cond) => evaluateCondition(cond, context));
    if (matches) {
      return rule;
    }
  }
  return null;
}
