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

// --- Targeting Rule Domain Model (Milestone 1.5) ---

export const TargetingRuleIdSchema = z
  .string()
  .uuid({ message: 'Targeting Rule ID must be a valid UUID' });

export const RuleOperatorSchema = z.enum([
  'EQUALS',
  'NOT_EQUALS',
  'CONTAINS',
  'STARTS_WITH',
  'ENDS_WITH',
  'IN',
  'NOT_IN',
  'GREATER_THAN',
  'LESS_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN_OR_EQUAL',
  'equals',
  'notEquals',
  'contains',
  'startsWith',
  'endsWith',
  'in',
  'notIn',
]);
export type RuleOperator = z.infer<typeof RuleOperatorSchema>;

export const RuleConditionSchema = z.object({
  attribute: z.string().trim().min(1, { message: 'Attribute cannot be empty' }),
  operator: RuleOperatorSchema,
  value: FeatureFlagValueSchema,
});
export type RuleCondition = z.infer<typeof RuleConditionSchema>;

export const TargetingRuleSchema = z.object({
  id: TargetingRuleIdSchema,
  featureFlagId: FeatureFlagIdSchema,
  priority: z.number().int().nonnegative({ message: 'Priority must be a non-negative integer' }),
  conditions: z
    .array(RuleConditionSchema)
    .min(1, { message: 'Rule must have at least one condition' }),
  value: FeatureFlagValueSchema,
  enabled: z.boolean(),
  createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
  updatedAt: z.string().datetime({ message: 'updatedAt must be an ISO 8601 datetime' }),
});
export type TargetingRule = z.infer<typeof TargetingRuleSchema>;

export const CreateTargetingRuleInputSchema = z.object({
  featureFlagId: FeatureFlagIdSchema,
  priority: z.number().int().nonnegative().default(0),
  conditions: z
    .array(RuleConditionSchema)
    .min(1, { message: 'Rule must have at least one condition' }),
  value: FeatureFlagValueSchema,
  enabled: z.boolean().default(true),
});
export type CreateTargetingRuleInput = z.input<typeof CreateTargetingRuleInputSchema>;
export type CreateTargetingRuleOutput = z.output<typeof CreateTargetingRuleInputSchema>;

export const UpdateTargetingRuleInputSchema = z.object({
  priority: z.number().int().nonnegative().optional(),
  conditions: z.array(RuleConditionSchema).min(1).optional(),
  value: FeatureFlagValueSchema.optional(),
  enabled: z.boolean().optional(),
});
export type UpdateTargetingRuleInput = z.infer<typeof UpdateTargetingRuleInputSchema>;

// --- Rollout Domain Model (Milestone 1.6) ---

export const RolloutIdSchema = z.string().uuid({ message: 'Rollout ID must be a valid UUID' });

export const RolloutPercentageSchema = z
  .number()
  .min(0, { message: 'Rollout percentage must be between 0 and 100' })
  .max(100, { message: 'Rollout percentage must be between 0 and 100' });

export const RolloutSaltSchema = z
  .string()
  .trim()
  .min(1, { message: 'Salt cannot be empty' })
  .max(128, { message: 'Salt cannot exceed 128 characters' });

export const RolloutSchema = z.object({
  id: RolloutIdSchema,
  featureFlagId: FeatureFlagIdSchema,
  percentage: RolloutPercentageSchema,
  salt: RolloutSaltSchema,
  enabled: z.boolean(),
  createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
  updatedAt: z.string().datetime({ message: 'updatedAt must be an ISO 8601 datetime' }),
});
export type Rollout = z.infer<typeof RolloutSchema>;

export const CreateRolloutInputSchema = z.object({
  featureFlagId: FeatureFlagIdSchema,
  percentage: RolloutPercentageSchema,
  salt: RolloutSaltSchema.default('v1'),
  enabled: z.boolean().default(true),
});
export type CreateRolloutInput = z.input<typeof CreateRolloutInputSchema>;
export type CreateRolloutOutput = z.output<typeof CreateRolloutInputSchema>;

export const UpdateRolloutInputSchema = z.object({
  percentage: RolloutPercentageSchema.optional(),
  salt: RolloutSaltSchema.optional(),
  enabled: z.boolean().optional(),
});
export type UpdateRolloutInput = z.infer<typeof UpdateRolloutInputSchema>;

// --- Configuration Snapshot & Version Domain Model (Milestone 1.7) ---

export const SnapshotFlagSchema = z
  .object({
    id: FeatureFlagIdSchema,
    environmentId: EnvironmentIdSchema,
    key: FeatureFlagKeySchema,
    name: FeatureFlagNameSchema,
    description: FeatureFlagDescriptionSchema,
    type: FlagTypeSchema,
    defaultValue: FeatureFlagValueSchema,
    enabled: z.boolean(),
    rules: z.array(TargetingRuleSchema).optional().default([]),
    rollout: RolloutSchema.optional(),
    createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
    updatedAt: z.string().datetime({ message: 'updatedAt must be an ISO 8601 datetime' }),
  })
  .refine((data) => isValidFlagValue(data.type, data.defaultValue), {
    message: 'defaultValue does not match the specified flag type',
    path: ['defaultValue'],
  });
export type SnapshotFlag = z.infer<typeof SnapshotFlagSchema>;

export const ConfigurationSnapshotSchema = z.object({
  schemaVersion: z.number().int().positive().default(1),
  projectKey: z.string().min(1),
  environmentKey: z.string().min(1),
  configurationVersion: z.number().int().positive(),
  checksum: z.string().min(1),
  flags: z.array(SnapshotFlagSchema),
});
export type ConfigurationSnapshot = z.infer<typeof ConfigurationSnapshotSchema>;

export const ConfigurationVersionIdSchema = z
  .string()
  .uuid({ message: 'Configuration Version ID must be a valid UUID' });

export const ConfigurationVersionNumberSchema = z
  .number()
  .int({ message: 'Version must be an integer' })
  .positive({ message: 'Version must be a positive integer (>= 1)' });

export const ChecksumSchema = z.string().trim().min(1, { message: 'Checksum cannot be empty' });

export const CreatedBySchema = z
  .string()
  .trim()
  .min(1, { message: 'createdBy cannot be empty' })
  .max(255, { message: 'createdBy cannot exceed 255 characters' });

export const VersionReasonSchema = z
  .string()
  .trim()
  .min(1, { message: 'Reason cannot be empty' })
  .max(1024, { message: 'Reason cannot exceed 1024 characters' });

export const ConfigurationVersionSchema = z.object({
  id: ConfigurationVersionIdSchema,
  environmentId: EnvironmentIdSchema,
  version: ConfigurationVersionNumberSchema,
  snapshot: z.record(z.unknown()),
  checksum: ChecksumSchema,
  createdBy: CreatedBySchema,
  reason: VersionReasonSchema,
  createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
});
export type ConfigurationVersion = z.infer<typeof ConfigurationVersionSchema>;

export const CreateConfigurationVersionInputSchema = z.object({
  environmentId: EnvironmentIdSchema,
  version: ConfigurationVersionNumberSchema,
  snapshot: z.record(z.unknown()),
  checksum: ChecksumSchema,
  createdBy: CreatedBySchema,
  reason: VersionReasonSchema.default('Configuration update'),
});
export type CreateConfigurationVersionInput = z.input<typeof CreateConfigurationVersionInputSchema>;
export type CreateConfigurationVersionOutput = z.output<
  typeof CreateConfigurationVersionInputSchema
>;

// --- Audit Event Domain Model (Milestone 1.8) ---

export const AuditEventIdSchema = z
  .string()
  .uuid({ message: 'Audit Event ID must be a valid UUID' });

export const ActorIdSchema = z
  .string()
  .trim()
  .min(1, { message: 'actorId cannot be empty' })
  .max(255, { message: 'actorId cannot exceed 255 characters' });

export const AuditActionSchema = z
  .string()
  .trim()
  .min(1, { message: 'Action cannot be empty' })
  .max(64, { message: 'Action cannot exceed 64 characters' });

export const AuditResourceTypeSchema = z
  .string()
  .trim()
  .min(1, { message: 'resourceType cannot be empty' })
  .max(64, { message: 'resourceType cannot exceed 64 characters' });

export const AuditResourceIdSchema = z
  .string()
  .trim()
  .min(1, { message: 'resourceId cannot be empty' })
  .max(255, { message: 'resourceId cannot exceed 255 characters' });

export const AuditEventSchema = z.object({
  id: AuditEventIdSchema,
  organizationId: OrganizationIdSchema,
  actorId: ActorIdSchema,
  action: AuditActionSchema,
  resourceType: AuditResourceTypeSchema,
  resourceId: AuditResourceIdSchema,
  before: z.record(z.unknown()).nullable(),
  after: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const CreateAuditEventInputSchema = z.object({
  organizationId: OrganizationIdSchema,
  actorId: ActorIdSchema,
  action: AuditActionSchema,
  resourceType: AuditResourceTypeSchema,
  resourceId: AuditResourceIdSchema,
  before: z.record(z.unknown()).nullable().default(null),
  after: z.record(z.unknown()).nullable().default(null),
});
export type CreateAuditEventInput = z.input<typeof CreateAuditEventInputSchema>;
export type CreateAuditEventOutput = z.output<typeof CreateAuditEventInputSchema>;

// --- User, Role, and API Key Contracts (Milestone 2.5 / 3.0) ---

export const UserIdSchema = z.string().uuid({ message: 'User ID must be a valid UUID' });
export const UserEmailSchema = z
  .string()
  .trim()
  .email({ message: 'Must be a valid email address' });
export const UserNameSchema = z.string().trim().min(1).max(255);

export const UserSchema = z.object({
  id: UserIdSchema,
  email: UserEmailSchema,
  name: UserNameSchema,
  createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
  updatedAt: z.string().datetime({ message: 'updatedAt must be an ISO 8601 datetime' }),
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserInputSchema = z.object({
  email: UserEmailSchema,
  name: UserNameSchema,
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

// --- Role & Permission Matrix Domain Model (Milestone 4.1 - 4.2) ---

export const StandardActionSchema = z.enum([
  'VIEW_FLAGS',
  'CREATE_FLAGS',
  'MODIFY_FLAGS',
  'PRODUCTION_ROLLOUT',
  'ROLLBACK',
  'DELETE_PROJECT',
  'MANAGE_USERS',
]);
export type StandardAction = z.infer<typeof StandardActionSchema>;

export const STANDARD_ACTIONS = {
  VIEW_FLAGS: 'VIEW_FLAGS',
  CREATE_FLAGS: 'CREATE_FLAGS',
  MODIFY_FLAGS: 'MODIFY_FLAGS',
  PRODUCTION_ROLLOUT: 'PRODUCTION_ROLLOUT',
  ROLLBACK: 'ROLLBACK',
  DELETE_PROJECT: 'DELETE_PROJECT',
  MANAGE_USERS: 'MANAGE_USERS',
} as const;

export type PermissionDecision = 'ALLOW' | 'DENY' | 'POLICY_REQUIRED';

export interface PermissionPolicyContext {
  environmentType?: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
  allowDeveloperProductionRollout?: boolean;
}

export interface PermissionEvaluationResult {
  decision: PermissionDecision;
  allowed: boolean;
  role: StandardRole;
  action: StandardAction;
  reason: string;
}

export const RoleIdSchema = z.string().uuid({ message: 'Role ID must be a valid UUID' });
export const StandardRoleSchema = z.enum(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']);
export type StandardRole = z.infer<typeof StandardRoleSchema>;

export const RoleNameSchema = z.string().trim().min(1).max(64);
export const RolePermissionsSchema = z.array(z.string().min(1)).default([]);

export const STANDARD_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  DEVELOPER: 'DEVELOPER',
  VIEWER: 'VIEWER',
} as const;

export const STANDARD_ROLE_METADATA: Record<
  StandardRole,
  { name: string; description: string; defaultPermissions: string[] }
> = {
  OWNER: {
    name: 'Owner',
    description: 'Full organization authority, project lifecycle, and administrative ownership',
    defaultPermissions: ['*'],
  },
  ADMIN: {
    name: 'Admin',
    description: 'Full project, environment, flag, and user management authority',
    defaultPermissions: [
      'projects:*',
      'environments:*',
      'flags:*',
      'rules:*',
      'rollouts:*',
      'versions:*',
      'audit:read',
    ],
  },
  DEVELOPER: {
    name: 'Developer',
    description:
      'Feature flag authoring, condition targeting, and non-production release management',
    defaultPermissions: [
      'projects:read',
      'environments:read',
      'flags:*',
      'rules:*',
      'rollouts:*',
      'versions:read',
      'versions:create',
      'audit:read',
    ],
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only visibility of flags, environments, and configuration snapshots',
    defaultPermissions: [
      'projects:read',
      'environments:read',
      'flags:read',
      'rules:read',
      'rollouts:read',
      'versions:read',
    ],
  },
};

export const RoleSchema = z.object({
  id: RoleIdSchema,
  organizationId: OrganizationIdSchema,
  name: RoleNameSchema,
  description: z.string().max(255).optional(),
  permissions: RolePermissionsSchema,
  createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
  updatedAt: z.string().datetime({ message: 'updatedAt must be an ISO 8601 datetime' }),
});
export type Role = z.infer<typeof RoleSchema>;

export const CreateRoleInputSchema = z.object({
  organizationId: OrganizationIdSchema,
  name: RoleNameSchema,
  description: z.string().max(255).optional(),
  permissions: RolePermissionsSchema.optional(),
});
export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;

export const ApiKeyIdSchema = z.string().uuid({ message: 'API Key ID must be a valid UUID' });
export const ApiKeyTypeSchema = z.enum(['SERVER', 'CLIENT', 'ADMIN']);

export const ApiKeySchema = z.object({
  id: ApiKeyIdSchema,
  organizationId: OrganizationIdSchema,
  environmentId: EnvironmentIdSchema.optional(),
  name: z.string().trim().min(1).max(255),
  keyHash: z.string().min(1),
  keyPrefix: z.string().min(1).max(16),
  type: ApiKeyTypeSchema,
  createdAt: z.string().datetime({ message: 'createdAt must be an ISO 8601 datetime' }),
  expiresAt: z.string().datetime().optional(),
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

export const CreateApiKeyInputSchema = z.object({
  organizationId: OrganizationIdSchema,
  environmentId: EnvironmentIdSchema.optional(),
  name: z.string().trim().min(1).max(255),
  keyHash: z.string().min(1),
  keyPrefix: z.string().min(1).max(16),
  type: ApiKeyTypeSchema,
  expiresAt: z.string().datetime().optional(),
});
export type CreateApiKeyInput = z.infer<typeof CreateApiKeyInputSchema>;

// --- Authentication & Session Contracts (Milestone 3.1 - 3.3) ---

export const PasswordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .max(128, { message: 'Password cannot exceed 128 characters' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one digit' })
  .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' });

export const RegisterUserInputSchema = z.object({
  email: UserEmailSchema,
  name: UserNameSchema,
  password: PasswordSchema,
  organizationName: OrganizationNameSchema.optional(),
});
export type RegisterUserInput = z.infer<typeof RegisterUserInputSchema>;

export const LoginInputSchema = z.object({
  email: UserEmailSchema,
  password: z.string().min(1, { message: 'Password is required' }),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const AuthSessionSchema = z.object({
  token: z.string().min(1),
  user: UserSchema,
  expiresAt: z.string().datetime({ message: 'expiresAt must be an ISO 8601 datetime' }),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const AuthRoleSchema = z.enum(['OWNER', 'ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER']);
export type AuthRole = z.infer<typeof AuthRoleSchema>;

export const AuthIdentitySchema = z.object({
  userId: UserIdSchema,
  email: UserEmailSchema,
  name: UserNameSchema,
  organizationId: OrganizationIdSchema.optional(),
  role: AuthRoleSchema.default('MEMBER'),
});
export type AuthIdentity = z.infer<typeof AuthIdentitySchema>;

export const AuthTokenTypeSchema = z.enum(['SESSION_BEARER', 'API_KEY']);
export type AuthTokenType = z.infer<typeof AuthTokenTypeSchema>;

export interface AuthorizationRequirement {
  roles?: AuthRole[];
  permissions?: string[];
  requireOrganization?: boolean;
}

export interface AuthenticatedRequestContext {
  identity: AuthIdentity;
  tokenType: AuthTokenType;
  token: string;
}

export const AuthErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string().min(1),
  message: z.string().min(1),
  code: z.string().min(1),
  timestamp: z.string().datetime(),
});
export type AuthErrorResponse = z.infer<typeof AuthErrorResponseSchema>;
