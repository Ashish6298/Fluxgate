import * as crypto from 'node:crypto';
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
import type {
  OrganizationRepository,
  ProjectRepository,
  EnvironmentRepository,
  FeatureFlagRepository,
  TargetingRuleRepository,
  RolloutRepository,
  ConfigurationVersionRepository,
  AuditEventRepository,
  UserRepository,
  RoleRepository,
  ApiKeyRepository,
  RepositoryContainer,
} from './interfaces.js';

export interface DatabaseStorage {
  organizations: Map<string, Organization>;
  projects: Map<string, Project>;
  environments: Map<string, Environment>;
  featureFlags: Map<string, FeatureFlag>;
  targetingRules: Map<string, TargetingRule>;
  rollouts: Map<string, Rollout>;
  configurationVersions: Map<string, ConfigurationVersion>;
  auditEvents: Map<string, AuditEvent>;
  users: Map<string, User>;
  roles: Map<string, Role>;
  apiKeys: Map<string, ApiKey>;
}

export function createDatabaseStorage(): DatabaseStorage {
  return {
    organizations: new Map(),
    projects: new Map(),
    environments: new Map(),
    featureFlags: new Map(),
    targetingRules: new Map(),
    rollouts: new Map(),
    configurationVersions: new Map(),
    auditEvents: new Map(),
    users: new Map(),
    roles: new Map(),
    apiKeys: new Map(),
  };
}

export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<Organization | null> {
    return this.storage.organizations.get(id) ?? null;
  }

  async findByName(name: string): Promise<Organization | null> {
    for (const org of this.storage.organizations.values()) {
      if (org.name === name) return org;
    }
    return null;
  }

  async create(input: CreateOrganizationInput): Promise<Organization> {
    const now = new Date().toISOString();
    const org: Organization = {
      id: crypto.randomUUID(),
      name: input.name,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.organizations.set(org.id, org);
    return org;
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization | null> {
    const existing = this.storage.organizations.get(id);
    if (!existing) return null;
    const updated: Organization = {
      ...existing,
      name: input.name ?? existing.name,
      updatedAt: new Date().toISOString(),
    };
    this.storage.organizations.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.storage.organizations.delete(id);
    if (existed) {
      // Cascading delete for projects & related hierarchy
      const projectIdsToDelete: string[] = [];
      for (const proj of this.storage.projects.values()) {
        if (proj.organizationId === id) {
          projectIdsToDelete.push(proj.id);
        }
      }
      for (const projId of projectIdsToDelete) {
        this.storage.projects.delete(projId);
        // Cascade to environments
        const envIdsToDelete: string[] = [];
        for (const env of this.storage.environments.values()) {
          if (env.projectId === projId) {
            envIdsToDelete.push(env.id);
          }
        }
        for (const envId of envIdsToDelete) {
          this.storage.environments.delete(envId);
          // Cascade to flags
          const flagIdsToDelete: string[] = [];
          for (const flag of this.storage.featureFlags.values()) {
            if (flag.environmentId === envId) {
              flagIdsToDelete.push(flag.id);
            }
          }
          for (const flagId of flagIdsToDelete) {
            this.storage.featureFlags.delete(flagId);
            // Cascade rules & rollouts
            for (const rule of [...this.storage.targetingRules.values()]) {
              if (rule.featureFlagId === flagId) {
                this.storage.targetingRules.delete(rule.id);
              }
            }
            for (const roll of [...this.storage.rollouts.values()]) {
              if (roll.featureFlagId === flagId) {
                this.storage.rollouts.delete(roll.id);
              }
            }
          }
          // Cascade versions
          for (const ver of [...this.storage.configurationVersions.values()]) {
            if (ver.environmentId === envId) {
              this.storage.configurationVersions.delete(ver.id);
            }
          }
        }
      }
      // Cascade roles & api keys
      for (const role of [...this.storage.roles.values()]) {
        if (role.organizationId === id) {
          this.storage.roles.delete(role.id);
        }
      }
      for (const key of [...this.storage.apiKeys.values()]) {
        if (key.organizationId === id) {
          this.storage.apiKeys.delete(key.id);
        }
      }
      for (const audit of [...this.storage.auditEvents.values()]) {
        if (audit.organizationId === id) {
          this.storage.auditEvents.delete(audit.id);
        }
      }
    }
    return existed;
  }

  async listAll(): Promise<Organization[]> {
    return Array.from(this.storage.organizations.values());
  }
}

export class PostgresProjectRepository implements ProjectRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<Project | null> {
    return this.storage.projects.get(id) ?? null;
  }

  async findByKey(organizationId: string, key: string): Promise<Project | null> {
    for (const proj of this.storage.projects.values()) {
      if (proj.organizationId === organizationId && proj.key === key) {
        return proj;
      }
    }
    return null;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    // Foreign key check
    if (!this.storage.organizations.has(input.organizationId)) {
      throw new Error(
        `Foreign key constraint failed: Organization ${input.organizationId} does not exist`,
      );
    }

    // Unique constraint: organizationId + key
    for (const proj of this.storage.projects.values()) {
      if (proj.organizationId === input.organizationId && proj.key === input.key) {
        throw new Error(
          `Unique constraint violated: Project key '${input.key}' already exists in organization`,
        );
      }
    }

    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      name: input.name,
      key: input.key,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.projects.set(project.id, project);
    return project;
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const existing = this.storage.projects.get(id);
    if (!existing) return null;
    const updated: Project = {
      ...existing,
      name: input.name ?? existing.name,
      updatedAt: new Date().toISOString(),
    };
    this.storage.projects.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.storage.projects.delete(id);
    if (existed) {
      // Cascade to environments
      const envIdsToDelete: string[] = [];
      for (const env of this.storage.environments.values()) {
        if (env.projectId === id) {
          envIdsToDelete.push(env.id);
        }
      }
      for (const envId of envIdsToDelete) {
        this.storage.environments.delete(envId);
      }
    }
    return existed;
  }

  async listAll(): Promise<Project[]> {
    return Array.from(this.storage.projects.values());
  }

  async listByOrganization(organizationId: string): Promise<Project[]> {
    return Array.from(this.storage.projects.values()).filter(
      (p) => p.organizationId === organizationId,
    );
  }
}

export class PostgresEnvironmentRepository implements EnvironmentRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<Environment | null> {
    return this.storage.environments.get(id) ?? null;
  }

  async findByKey(projectId: string, key: string): Promise<Environment | null> {
    for (const env of this.storage.environments.values()) {
      if (env.projectId === projectId && env.key === key) {
        return env;
      }
    }
    return null;
  }

  async create(input: CreateEnvironmentInput): Promise<Environment> {
    // Foreign key check
    if (!this.storage.projects.has(input.projectId)) {
      throw new Error(`Foreign key constraint failed: Project ${input.projectId} does not exist`);
    }

    // Unique constraint: projectId + key
    for (const env of this.storage.environments.values()) {
      if (env.projectId === input.projectId && env.key === input.key) {
        throw new Error(
          `Unique constraint violated: Environment key '${input.key}' already exists in project`,
        );
      }
    }

    const now = new Date().toISOString();
    const environment: Environment = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      name: input.name,
      key: input.key,
      type: input.type ?? 'CUSTOM',
      createdAt: now,
      updatedAt: now,
    };
    this.storage.environments.set(environment.id, environment);
    return environment;
  }

  async update(id: string, input: UpdateEnvironmentInput): Promise<Environment | null> {
    const existing = this.storage.environments.get(id);
    if (!existing) return null;
    const updated: Environment = {
      ...existing,
      name: input.name ?? existing.name,
      type: input.type ?? existing.type,
      updatedAt: new Date().toISOString(),
    };
    this.storage.environments.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.storage.environments.delete(id);
    if (existed) {
      // Cascade to flags
      const flagIdsToDelete: string[] = [];
      for (const flag of this.storage.featureFlags.values()) {
        if (flag.environmentId === id) {
          flagIdsToDelete.push(flag.id);
        }
      }
      for (const flagId of flagIdsToDelete) {
        this.storage.featureFlags.delete(flagId);
      }
    }
    return existed;
  }

  async listAll(): Promise<Environment[]> {
    return Array.from(this.storage.environments.values());
  }

  async listByProject(projectId: string): Promise<Environment[]> {
    return Array.from(this.storage.environments.values()).filter((e) => e.projectId === projectId);
  }
}

export class PostgresFeatureFlagRepository implements FeatureFlagRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<FeatureFlag | null> {
    return this.storage.featureFlags.get(id) ?? null;
  }

  async findByKey(environmentId: string, key: string): Promise<FeatureFlag | null> {
    for (const flag of this.storage.featureFlags.values()) {
      if (flag.environmentId === environmentId && flag.key === key) {
        return flag;
      }
    }
    return null;
  }

  async create(input: CreateFeatureFlagInput): Promise<FeatureFlag> {
    if (!this.storage.environments.has(input.environmentId)) {
      throw new Error(
        `Foreign key constraint failed: Environment ${input.environmentId} does not exist`,
      );
    }

    for (const flag of this.storage.featureFlags.values()) {
      if (flag.environmentId === input.environmentId && flag.key === input.key) {
        throw new Error(
          `Unique constraint violated: FeatureFlag key '${input.key}' already exists in environment`,
        );
      }
    }

    const now = new Date().toISOString();
    const flag: FeatureFlag = {
      id: crypto.randomUUID(),
      environmentId: input.environmentId,
      key: input.key,
      name: input.name,
      description: input.description,
      type: input.type,
      defaultValue: input.defaultValue,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.featureFlags.set(flag.id, flag);
    return flag;
  }

  async update(id: string, input: UpdateFeatureFlagInput): Promise<FeatureFlag | null> {
    const existing = this.storage.featureFlags.get(id);
    if (!existing) return null;
    const updated: FeatureFlag = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description !== undefined ? input.description : existing.description,
      defaultValue: input.defaultValue !== undefined ? input.defaultValue : existing.defaultValue,
      enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
      updatedAt: new Date().toISOString(),
    };
    this.storage.featureFlags.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.storage.featureFlags.delete(id);
    if (existed) {
      for (const rule of [...this.storage.targetingRules.values()]) {
        if (rule.featureFlagId === id) this.storage.targetingRules.delete(rule.id);
      }
      for (const roll of [...this.storage.rollouts.values()]) {
        if (roll.featureFlagId === id) this.storage.rollouts.delete(roll.id);
      }
    }
    return existed;
  }

  async listAll(): Promise<FeatureFlag[]> {
    return Array.from(this.storage.featureFlags.values());
  }

  async listByEnvironment(environmentId: string): Promise<FeatureFlag[]> {
    return Array.from(this.storage.featureFlags.values()).filter(
      (f) => f.environmentId === environmentId,
    );
  }
}

export class PostgresTargetingRuleRepository implements TargetingRuleRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<TargetingRule | null> {
    return this.storage.targetingRules.get(id) ?? null;
  }

  async create(input: CreateTargetingRuleInput): Promise<TargetingRule> {
    if (!this.storage.featureFlags.has(input.featureFlagId)) {
      throw new Error(
        `Foreign key constraint failed: FeatureFlag ${input.featureFlagId} does not exist`,
      );
    }

    const now = new Date().toISOString();
    const rule: TargetingRule = {
      id: crypto.randomUUID(),
      featureFlagId: input.featureFlagId,
      priority: input.priority ?? 0,
      conditions: input.conditions,
      value: input.value,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.targetingRules.set(rule.id, rule);
    return rule;
  }

  async update(id: string, input: UpdateTargetingRuleInput): Promise<TargetingRule | null> {
    const existing = this.storage.targetingRules.get(id);
    if (!existing) return null;
    const updated: TargetingRule = {
      ...existing,
      priority: input.priority !== undefined ? input.priority : existing.priority,
      conditions: input.conditions !== undefined ? input.conditions : existing.conditions,
      value: input.value !== undefined ? input.value : existing.value,
      enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
      updatedAt: new Date().toISOString(),
    };
    this.storage.targetingRules.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.storage.targetingRules.delete(id);
  }

  async listAll(): Promise<TargetingRule[]> {
    return Array.from(this.storage.targetingRules.values());
  }

  async listByFeatureFlag(featureFlagId: string): Promise<TargetingRule[]> {
    return Array.from(this.storage.targetingRules.values())
      .filter((r) => r.featureFlagId === featureFlagId)
      .sort((a, b) => a.priority - b.priority);
  }
}

export class PostgresRolloutRepository implements RolloutRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<Rollout | null> {
    return this.storage.rollouts.get(id) ?? null;
  }

  async findByFeatureFlag(featureFlagId: string): Promise<Rollout | null> {
    for (const rollout of this.storage.rollouts.values()) {
      if (rollout.featureFlagId === featureFlagId) {
        return rollout;
      }
    }
    return null;
  }

  async create(input: CreateRolloutInput): Promise<Rollout> {
    if (!this.storage.featureFlags.has(input.featureFlagId)) {
      throw new Error(
        `Foreign key constraint failed: FeatureFlag ${input.featureFlagId} does not exist`,
      );
    }

    for (const rollout of this.storage.rollouts.values()) {
      if (rollout.featureFlagId === input.featureFlagId) {
        throw new Error(`Unique constraint violated: Rollout already exists for feature flag`);
      }
    }

    const now = new Date().toISOString();
    const rollout: Rollout = {
      id: crypto.randomUUID(),
      featureFlagId: input.featureFlagId,
      percentage: input.percentage,
      salt: input.salt ?? 'v1',
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.rollouts.set(rollout.id, rollout);
    return rollout;
  }

  async update(id: string, input: UpdateRolloutInput): Promise<Rollout | null> {
    const existing = this.storage.rollouts.get(id);
    if (!existing) return null;
    const updated: Rollout = {
      ...existing,
      percentage: input.percentage !== undefined ? input.percentage : existing.percentage,
      salt: input.salt !== undefined ? input.salt : existing.salt,
      enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
      updatedAt: new Date().toISOString(),
    };
    this.storage.rollouts.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.storage.rollouts.delete(id);
  }

  async listAll(): Promise<Rollout[]> {
    return Array.from(this.storage.rollouts.values());
  }
}

export class PostgresConfigurationVersionRepository implements ConfigurationVersionRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<ConfigurationVersion | null> {
    return this.storage.configurationVersions.get(id) ?? null;
  }

  async findByVersion(
    environmentId: string,
    version: number,
  ): Promise<ConfigurationVersion | null> {
    for (const v of this.storage.configurationVersions.values()) {
      if (v.environmentId === environmentId && v.version === version) {
        return v;
      }
    }
    return null;
  }

  async getLatestVersion(environmentId: string): Promise<ConfigurationVersion | null> {
    const versions = await this.listByEnvironment(environmentId);
    return versions[0] ?? null;
  }

  async create(input: CreateConfigurationVersionInput): Promise<ConfigurationVersion> {
    if (!this.storage.environments.has(input.environmentId)) {
      throw new Error(
        `Foreign key constraint failed: Environment ${input.environmentId} does not exist`,
      );
    }

    for (const v of this.storage.configurationVersions.values()) {
      if (v.environmentId === input.environmentId && v.version === input.version) {
        throw new Error(
          `Unique constraint violated: Configuration version ${input.version} already exists in environment`,
        );
      }
    }

    const now = new Date().toISOString();
    const version: ConfigurationVersion = {
      id: crypto.randomUUID(),
      environmentId: input.environmentId,
      version: input.version,
      snapshot: input.snapshot,
      checksum: input.checksum,
      createdBy: input.createdBy,
      reason: input.reason ?? 'Configuration update',
      createdAt: now,
    };
    this.storage.configurationVersions.set(version.id, version);
    return version;
  }

  async listByEnvironment(environmentId: string): Promise<ConfigurationVersion[]> {
    return Array.from(this.storage.configurationVersions.values())
      .filter((v) => v.environmentId === environmentId)
      .sort((a, b) => b.version - a.version);
  }
}

export class PostgresAuditEventRepository implements AuditEventRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<AuditEvent | null> {
    return this.storage.auditEvents.get(id) ?? null;
  }

  async create(input: CreateAuditEventInput): Promise<AuditEvent> {
    if (!this.storage.organizations.has(input.organizationId)) {
      throw new Error(
        `Foreign key constraint failed: Organization ${input.organizationId} does not exist`,
      );
    }

    const now = new Date().toISOString();
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      before: input.before ?? null,
      after: input.after ?? null,
      createdAt: now,
    };
    this.storage.auditEvents.set(event.id, event);
    return event;
  }

  async listByOrganization(organizationId: string): Promise<AuditEvent[]> {
    return Array.from(this.storage.auditEvents.values())
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async listByResource(resourceType: string, resourceId: string): Promise<AuditEvent[]> {
    return Array.from(this.storage.auditEvents.values())
      .filter((e) => e.resourceType === resourceType && e.resourceId === resourceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export class PostgresUserRepository implements UserRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<User | null> {
    return this.storage.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.storage.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async create(input: CreateUserInput): Promise<User> {
    for (const user of this.storage.users.values()) {
      if (user.email.toLowerCase() === input.email.toLowerCase()) {
        throw new Error(`Unique constraint violated: Email ${input.email} is already registered`);
      }
    }

    const now = new Date().toISOString();
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.users.set(user.id, user);
    return user;
  }

  async listAll(): Promise<User[]> {
    return Array.from(this.storage.users.values());
  }
}

export class PostgresRoleRepository implements RoleRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<Role | null> {
    return this.storage.roles.get(id) ?? null;
  }

  async findByName(organizationId: string, name: string): Promise<Role | null> {
    for (const role of this.storage.roles.values()) {
      if (role.organizationId === organizationId && role.name === name) {
        return role;
      }
    }
    return null;
  }

  async create(input: CreateRoleInput): Promise<Role> {
    if (!this.storage.organizations.has(input.organizationId)) {
      throw new Error(
        `Foreign key constraint failed: Organization ${input.organizationId} does not exist`,
      );
    }

    for (const role of this.storage.roles.values()) {
      if (role.organizationId === input.organizationId && role.name === input.name) {
        throw new Error(
          `Unique constraint violated: Role '${input.name}' already exists in organization`,
        );
      }
    }

    const now = new Date().toISOString();
    const role: Role = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      permissions: input.permissions ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.storage.roles.set(role.id, role);
    return role;
  }

  async listByOrganization(organizationId: string): Promise<Role[]> {
    return Array.from(this.storage.roles.values()).filter(
      (r) => r.organizationId === organizationId,
    );
  }
}

export class PostgresApiKeyRepository implements ApiKeyRepository {
  constructor(private storage: DatabaseStorage) {}

  async findById(id: string): Promise<ApiKey | null> {
    return this.storage.apiKeys.get(id) ?? null;
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    for (const key of this.storage.apiKeys.values()) {
      if (key.keyHash === keyHash) {
        return key;
      }
    }
    return null;
  }

  async create(input: CreateApiKeyInput): Promise<ApiKey> {
    if (!this.storage.organizations.has(input.organizationId)) {
      throw new Error(
        `Foreign key constraint failed: Organization ${input.organizationId} does not exist`,
      );
    }
    if (input.environmentId && !this.storage.environments.has(input.environmentId)) {
      throw new Error(
        `Foreign key constraint failed: Environment ${input.environmentId} does not exist`,
      );
    }

    for (const key of this.storage.apiKeys.values()) {
      if (key.keyHash === input.keyHash) {
        throw new Error(`Unique constraint violated: API Key hash already exists`);
      }
    }

    const now = new Date().toISOString();
    const apiKey: ApiKey = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      environmentId: input.environmentId,
      name: input.name,
      keyHash: input.keyHash,
      keyPrefix: input.keyPrefix,
      type: input.type,
      createdAt: now,
      expiresAt: input.expiresAt,
    };
    this.storage.apiKeys.set(apiKey.id, apiKey);
    return apiKey;
  }

  async listByOrganization(organizationId: string): Promise<ApiKey[]> {
    return Array.from(this.storage.apiKeys.values()).filter(
      (k) => k.organizationId === organizationId,
    );
  }

  async listByEnvironment(environmentId: string): Promise<ApiKey[]> {
    return Array.from(this.storage.apiKeys.values()).filter(
      (k) => k.environmentId === environmentId,
    );
  }

  async delete(id: string): Promise<boolean> {
    return this.storage.apiKeys.delete(id);
  }
}

/**
 * Creates a fully instantiated PostgreSQL implementation container
 */
export function createRepositoryContainer(customStorage?: DatabaseStorage): RepositoryContainer {
  const storage = customStorage ?? createDatabaseStorage();
  return {
    organizations: new PostgresOrganizationRepository(storage),
    projects: new PostgresProjectRepository(storage),
    environments: new PostgresEnvironmentRepository(storage),
    featureFlags: new PostgresFeatureFlagRepository(storage),
    targetingRules: new PostgresTargetingRuleRepository(storage),
    rollouts: new PostgresRolloutRepository(storage),
    configurationVersions: new PostgresConfigurationVersionRepository(storage),
    auditEvents: new PostgresAuditEventRepository(storage),
    users: new PostgresUserRepository(storage),
    roles: new PostgresRoleRepository(storage),
    apiKeys: new PostgresApiKeyRepository(storage),
  };
}
