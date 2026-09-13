import { z } from 'zod';

export const FlagTypeSchema = z.enum(['BOOLEAN', 'STRING', 'NUMBER', 'JSON']);
export type FlagType = z.infer<typeof FlagTypeSchema>;

export const EvaluationReasonSchema = z.enum([
  'DEFAULT',
  'FLAG_DISABLED',
  'TARGETING_RULE',
  'PERCENTAGE_ROLLOUT',
  'ROLLOUT_EXCLUDED',
  'UNKNOWN_FLAG',
  'ERROR',
]);
export type EvaluationReason = z.infer<typeof EvaluationReasonSchema>;

export const EvaluationContextSchema = z.object({
  userId: z.string().optional(),
  anonymousId: z.string().optional(),
  platform: z.string().optional(),
  appVersion: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  customAttributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;

export const EvaluationResultSchema = z.object({
  flagKey: z.string(),
  value: z.union([z.boolean(), z.string(), z.number(), z.record(z.unknown())]),
  reason: EvaluationReasonSchema,
  configurationVersion: z.number().optional(),
  matchedRule: z.string().optional(),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
