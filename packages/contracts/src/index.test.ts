import { describe, it, expect } from 'vitest';
import { FlagTypeSchema, EvaluationContextSchema } from './index.js';

describe('Contracts Package', () => {
  it('should validate flag types', () => {
    expect(FlagTypeSchema.safeParse('BOOLEAN').success).toBe(true);
    expect(FlagTypeSchema.safeParse('INVALID').success).toBe(false);
  });

  it('should validate evaluation context', () => {
    const ctx = {
      userId: 'user_123',
      country: 'IN',
      customAttributes: { beta: true, tier: 2 },
    };
    expect(EvaluationContextSchema.safeParse(ctx).success).toBe(true);
  });
});
