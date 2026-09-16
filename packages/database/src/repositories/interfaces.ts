import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  Environment,
  CreateEnvironmentInput,
  UpdateEnvironmentInput,
  FeatureFlag,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  TargetingRule,
  CreateTargetingRuleInput,
  UpdateTargetingRuleInput,
  Rollout,
  CreateRolloutInput,
  UpdateRolloutInput,
  ConfigurationVersion,
  CreateConfigurationVersionInput,
  AuditEvent,
  CreateAuditEventInput,
  User,
  CreateUserInput,
  Role,
  CreateRoleInput,
  ApiKey,
  CreateApiKeyInput,
} from '@controlplane/contracts';

/**
 * Base Repository Interface
 */
export interface BaseRepository<T, TCreate, TUpdate> {
  findById(id: string): Promise<T | null>;
  create(input: TCreate): Promise<T>;
  update(id: string, input: TUpdate): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  listAll(): Promise<T[]>;
}

/**
 * Organization Repository Interface
 */
export interface OrganizationRepository extends BaseRepository<
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput
> {
  findByName(name: string): Promise<Organization | null>;
}

/**
 * Project Repository Interface
 */
export interface ProjectRepository extends BaseRepository<
  Project,
  CreateProjectInput,
  UpdateProjectInput
> {
  findByKey(organizationId: string, key: string): Promise<Project | null>;
  listByOrganization(organizationId: string): Promise<Project[]>;
}

/**
 * Environment Repository Interface
 */
export interface EnvironmentRepository extends BaseRepository<
  Environment,
  CreateEnvironmentInput,
  UpdateEnvironmentInput
> {
  findByKey(projectId: string, key: string): Promise<Environment | null>;
  listByProject(projectId: string): Promise<Environment[]>;
}

/**
 * Feature Flag Repository Interface
 */
export interface FeatureFlagRepository extends BaseRepository<
  FeatureFlag,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput
> {
  findByKey(environmentId: string, key: string): Promise<FeatureFlag | null>;
  listByEnvironment(environmentId: string): Promise<FeatureFlag[]>;
}

/**
 * Targeting Rule Repository Interface
 */
export interface TargetingRuleRepository extends BaseRepository<
  TargetingRule,
  CreateTargetingRuleInput,
  UpdateTargetingRuleInput
> {
  listByFeatureFlag(featureFlagId: string): Promise<TargetingRule[]>;
}

/**
 * Rollout Repository Interface
 */
export interface RolloutRepository extends BaseRepository<
  Rollout,
  CreateRolloutInput,
  UpdateRolloutInput
> {
  findByFeatureFlag(featureFlagId: string): Promise<Rollout | null>;
}

/**
 * Configuration Version Repository Interface
 */
export interface ConfigurationVersionRepository {
  findById(id: string): Promise<ConfigurationVersion | null>;
  findByVersion(environmentId: string, version: number): Promise<ConfigurationVersion | null>;
  getLatestVersion(environmentId: string): Promise<ConfigurationVersion | null>;
  create(input: CreateConfigurationVersionInput): Promise<ConfigurationVersion>;
  listByEnvironment(environmentId: string): Promise<ConfigurationVersion[]>;
}

/**
 * Audit Event Repository Interface
 */
export interface AuditEventRepository {
  findById(id: string): Promise<AuditEvent | null>;
  create(input: CreateAuditEventInput): Promise<AuditEvent>;
  listByOrganization(organizationId: string): Promise<AuditEvent[]>;
  listByResource(resourceType: string, resourceId: string): Promise<AuditEvent[]>;
}

/**
 * User Repository Interface
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  listAll(): Promise<User[]>;
}

/**
 * Role Repository Interface
 */
export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(organizationId: string, name: string): Promise<Role | null>;
  create(input: CreateRoleInput): Promise<Role>;
  listByOrganization(organizationId: string): Promise<Role[]>;
}

/**
 * API Key Repository Interface
 */
export interface ApiKeyRepository {
  findById(id: string): Promise<ApiKey | null>;
  findByKeyHash(keyHash: string): Promise<ApiKey | null>;
  create(input: CreateApiKeyInput): Promise<ApiKey>;
  listByOrganization(organizationId: string): Promise<ApiKey[]>;
  listByEnvironment(environmentId: string): Promise<ApiKey[]>;
  delete(id: string): Promise<boolean>;
}

/**
 * Complete Unified Repository Container Interface
 */
export interface RepositoryContainer {
  organizations: OrganizationRepository;
  projects: ProjectRepository;
  environments: EnvironmentRepository;
  featureFlags: FeatureFlagRepository;
  targetingRules: TargetingRuleRepository;
  rollouts: RolloutRepository;
  configurationVersions: ConfigurationVersionRepository;
  auditEvents: AuditEventRepository;
  users: UserRepository;
  roles: RoleRepository;
  apiKeys: ApiKeyRepository;
}
