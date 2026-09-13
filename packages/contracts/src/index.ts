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

export const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ]),
);

export const FeatureFlagValueSchema = z.union([
  z.boolean(),
  z.string(),
  z.number(),
  JsonValueSchema,
]);
export type FeatureFlagValue = z.infer<typeof FeatureFlagValueSchema>;

export const EvaluationResultSchema = z.object({
  flagKey: z.string(),
  value: FeatureFlagValueSchema,
  reason: EvaluationReasonSchema,
  configurationVersion: z.number().optional(),
  matchedRule: z.string().optional(),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

// --- Organization Domain Model (Milestone 1.1) ---

export const OrganizationIdSchema = z
  .string()
  .uuid({ message: 'Organization ID must be a valid UUID' });

export const OrganizationNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Organization name cannot be empty' })
  .max(255, { message: 'Organization name cannot exceed 255 characters' });

export const OrganizationSchema = z.object({
  id: OrganizationIdSchema,
  name: OrganizationNameSchema,
  createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
  updatedAt: z.string().datetime({ message: 'updatedAt must be an ISO 8601 datetime' }),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationInputSchema = z.object({
  name: OrganizationNameSchema,
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInputSchema>;

export const UpdateOrganizationInputSchema = z.object({
  name: OrganizationNameSchema,
});
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationInputSchema>;

// --- Project Domain Model (Milestone 1.2) ---

export const ProjectIdSchema = z.string().uuid({ message: 'Project ID must be a valid UUID' });

export const ProjectKeySchema = z
  .string()
  .trim()
  .min(2, { message: 'Project key must be at least 2 characters long' })
  .max(63, { message: 'Project key cannot exceed 63 characters' })
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'Project key must be lowercase alphanumeric and may contain single hyphens (kebab-case)',
  });

export const ProjectNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Project name cannot be empty' })
  .max(255, { message: 'Project name cannot exceed 255 characters' });

export const ProjectSchema = z.object({
  id: ProjectIdSchema,
  organizationId: OrganizationIdSchema,
  name: ProjectNameSchema,
  key: ProjectKeySchema,
  createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
  updatedAt: z.string().datetime({ message: 'updatedAt must be an ISO 8601 datetime' }),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectInputSchema = z.object({
  organizationId: OrganizationIdSchema,
  name: ProjectNameSchema,
  key: ProjectKeySchema,
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export const UpdateProjectInputSchema = z.object({
  name: ProjectNameSchema,
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

// --- Environment Domain Model (Milestone 1.3) ---

export const EnvironmentIdSchema = z
  .string()
  .uuid({ message: 'Environment ID must be a valid UUID' });

export const EnvironmentKeySchema = z
  .string()
  .trim()
  .min(2, { message: 'Environment key must be at least 2 characters long' })
  .max(63, { message: 'Environment key cannot exceed 63 characters' })
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'Environment key must be lowercase alphanumeric and may contain single hyphens (kebab-case)',
  });

export const EnvironmentNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Environment name cannot be empty' })
  .max(255, { message: 'Environment name cannot exceed 255 characters' });

export const EnvironmentTypeSchema = z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'CUSTOM']);
export type EnvironmentType = z.infer<typeof EnvironmentTypeSchema>;

export const EnvironmentSchema = z.object({
  id: EnvironmentIdSchema,
  projectId: ProjectIdSchema,
  name: EnvironmentNameSchema,
  key: EnvironmentKeySchema,
  type: EnvironmentTypeSchema,
  createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
  updatedAt: z.string().datetime({ message: 'updatedAt must be an ISO 8601 datetime' }),
});
export type Environment = z.infer<typeof EnvironmentSchema>;

export const CreateEnvironmentInputSchema = z.object({
  projectId: ProjectIdSchema,
  name: EnvironmentNameSchema,
  key: EnvironmentKeySchema,
  type: EnvironmentTypeSchema.default('CUSTOM'),
});
export type CreateEnvironmentInput = z.input<typeof CreateEnvironmentInputSchema>;
export type CreateEnvironmentOutput = z.output<typeof CreateEnvironmentInputSchema>;

export const UpdateEnvironmentInputSchema = z.object({
  name: EnvironmentNameSchema.optional(),
  type: EnvironmentTypeSchema.optional(),
});
export type UpdateEnvironmentInput = z.infer<typeof UpdateEnvironmentInputSchema>;

// --- Feature Flag Domain Model (Milestone 1.4) ---

export const FeatureFlagIdSchema = z
  .string()
  .uuid({ message: 'Feature Flag ID must be a valid UUID' });

export const FeatureFlagKeySchema = z
  .string()
  .trim()
  .min(2, { message: 'Feature flag key must be at least 2 characters long' })
  .max(64, { message: 'Feature flag key cannot exceed 64 characters' })
  .regex(/^[a-z0-9]+([-_][a-z0-9]+)*$/, {
    message:
      'Feature flag key must be lowercase alphanumeric and may contain hyphens or underscores (snake_case / kebab-case)',
  });

export const FeatureFlagNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Feature flag name cannot be empty' })
  .max(255, { message: 'Feature flag name cannot exceed 255 characters' });

export const FeatureFlagDescriptionSchema = z
  .string()
  .trim()
  .max(1024, { message: 'Description cannot exceed 1024 characters' })
  .optional();

/**
 * Validates whether a value satisfies the specified FlagType.
 */
export function isValidFlagValue(type: FlagType, value: unknown): boolean {
  switch (type) {
    case 'BOOLEAN':
      return typeof value === 'boolean';
    case 'STRING':
      return typeof value === 'string';
    case 'NUMBER':
      return typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value);
    case 'JSON':
      return value !== undefined && JsonValueSchema.safeParse(value).success;
    default:
      return false;
  }
}

export const FeatureFlagSchema = z
  .object({
    id: FeatureFlagIdSchema,
    environmentId: EnvironmentIdSchema,
    key: FeatureFlagKeySchema,
    name: FeatureFlagNameSchema,
    description: FeatureFlagDescriptionSchema,
    type: FlagTypeSchema,
    defaultValue: FeatureFlagValueSchema,
    enabled: z.boolean(),
    createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
    updatedAt: z.string().datetime({ message: 'updatedAt must be an ISO 8601 datetime' }),
  })
  .refine((data) => isValidFlagValue(data.type, data.defaultValue), {
    message: 'defaultValue does not match the specified flag type',
    path: ['defaultValue'],
  });
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const CreateFeatureFlagInputSchema = z
  .object({
    environmentId: EnvironmentIdSchema,
    key: FeatureFlagKeySchema,
    name: FeatureFlagNameSchema,
    description: FeatureFlagDescriptionSchema,
    type: FlagTypeSchema,
    defaultValue: FeatureFlagValueSchema,
    enabled: z.boolean().default(true),
  })
  .refine((data) => isValidFlagValue(data.type, data.defaultValue), {
    message: 'defaultValue does not match the specified flag type',
    path: ['defaultValue'],
  });
export type CreateFeatureFlagInput = z.input<typeof CreateFeatureFlagInputSchema>;
export type CreateFeatureFlagOutput = z.output<typeof CreateFeatureFlagInputSchema>;

export const UpdateFeatureFlagInputSchema = z.object({
  name: FeatureFlagNameSchema.optional(),
  description: FeatureFlagDescriptionSchema,
  defaultValue: FeatureFlagValueSchema.optional(),
  enabled: z.boolean().optional(),
});
export type UpdateFeatureFlagInput = z.infer<typeof UpdateFeatureFlagInputSchema>;
