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

export class PostgresOrganizationRepository implements OrganizationRepository {
  private store = new Map<string, Organization>();

  async findById(id: string): Promise<Organization | null> {
    return this.store.get(id) ?? null;
  }

  async findByName(name: string): Promise<Organization | null> {
    for (const org of this.store.values()) {
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
    this.store.set(org.id, org);
    return org;
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: Organization = {
      ...existing,
      name: input.name ?? existing.name,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async listAll(): Promise<Organization[]> {
    return Array.from(this.store.values());
  }
}

export class PostgresProjectRepository implements ProjectRepository {
  private store = new Map<string, Project>();

  async findById(id: string): Promise<Project | null> {
    return this.store.get(id) ?? null;
  }

  async findByKey(organizationId: string, key: string): Promise<Project | null> {
    for (const proj of this.store.values()) {
      if (proj.organizationId === organizationId && proj.key === key) {
        return proj;
      }
    }
    return null;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      name: input.name,
      key: input.key,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(project.id, project);
    return project;
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: Project = {
      ...existing,
      name: input.name ?? existing.name,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async listAll(): Promise<Project[]> {
    return Array.from(this.store.values());
  }

  async listByOrganization(organizationId: string): Promise<Project[]> {
    return Array.from(this.store.values()).filter((p) => p.organizationId === organizationId);
  }
}

export class PostgresEnvironmentRepository implements EnvironmentRepository {
  private store = new Map<string, Environment>();

  async findById(id: string): Promise<Environment | null> {
    return this.store.get(id) ?? null;
  }

  async findByKey(projectId: string, key: string): Promise<Environment | null> {
    for (const env of this.store.values()) {
      if (env.projectId === projectId && env.key === key) {
        return env;
      }
    }
    return null;
  }

  async create(input: CreateEnvironmentInput): Promise<Environment> {
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
    this.store.set(environment.id, environment);
    return environment;
  }

  async update(id: string, input: UpdateEnvironmentInput): Promise<Environment | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: Environment = {
      ...existing,
      name: input.name ?? existing.name,
      type: input.type ?? existing.type,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async listAll(): Promise<Environment[]> {
    return Array.from(this.store.values());
  }

  async listByProject(projectId: string): Promise<Environment[]> {
    return Array.from(this.store.values()).filter((e) => e.projectId === projectId);
  }
}

export class PostgresFeatureFlagRepository implements FeatureFlagRepository {
  private store = new Map<string, FeatureFlag>();

  async findById(id: string): Promise<FeatureFlag | null> {
    return this.store.get(id) ?? null;
  }

  async findByKey(environmentId: string, key: string): Promise<FeatureFlag | null> {
    for (const flag of this.store.values()) {
      if (flag.environmentId === environmentId && flag.key === key) {
        return flag;
      }
    }
    return null;
  }

  async create(input: CreateFeatureFlagInput): Promise<FeatureFlag> {
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
    this.store.set(flag.id, flag);
    return flag;
  }

  async update(id: string, input: UpdateFeatureFlagInput): Promise<FeatureFlag | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: FeatureFlag = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description !== undefined ? input.description : existing.description,
      defaultValue: input.defaultValue !== undefined ? input.defaultValue : existing.defaultValue,
      enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async listAll(): Promise<FeatureFlag[]> {
    return Array.from(this.store.values());
  }

  async listByEnvironment(environmentId: string): Promise<FeatureFlag[]> {
    return Array.from(this.store.values()).filter((f) => f.environmentId === environmentId);
  }
}

export class PostgresTargetingRuleRepository implements TargetingRuleRepository {
  private store = new Map<string, TargetingRule>();

  async findById(id: string): Promise<TargetingRule | null> {
    return this.store.get(id) ?? null;
  }

  async create(input: CreateTargetingRuleInput): Promise<TargetingRule> {
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
    this.store.set(rule.id, rule);
    return rule;
  }

  async update(id: string, input: UpdateTargetingRuleInput): Promise<TargetingRule | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: TargetingRule = {
      ...existing,
      priority: input.priority !== undefined ? input.priority : existing.priority,
      conditions: input.conditions !== undefined ? input.conditions : existing.conditions,
      value: input.value !== undefined ? input.value : existing.value,
      enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async listAll(): Promise<TargetingRule[]> {
    return Array.from(this.store.values());
  }

  async listByFeatureFlag(featureFlagId: string): Promise<TargetingRule[]> {
    return Array.from(this.store.values())
      .filter((r) => r.featureFlagId === featureFlagId)
      .sort((a, b) => a.priority - b.priority);
  }
}

export class PostgresRolloutRepository implements RolloutRepository {
  private store = new Map<string, Rollout>();

  async findById(id: string): Promise<Rollout | null> {
    return this.store.get(id) ?? null;
  }

  async findByFeatureFlag(featureFlagId: string): Promise<Rollout | null> {
    for (const rollout of this.store.values()) {
      if (rollout.featureFlagId === featureFlagId) {
        return rollout;
      }
    }
    return null;
  }

  async create(input: CreateRolloutInput): Promise<Rollout> {
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
    this.store.set(rollout.id, rollout);
    return rollout;
  }

  async update(id: string, input: UpdateRolloutInput): Promise<Rollout | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: Rollout = {
      ...existing,
      percentage: input.percentage !== undefined ? input.percentage : existing.percentage,
      salt: input.salt !== undefined ? input.salt : existing.salt,
      enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async listAll(): Promise<Rollout[]> {
    return Array.from(this.store.values());
  }
}

export class PostgresConfigurationVersionRepository implements ConfigurationVersionRepository {
  private store = new Map<string, ConfigurationVersion>();

  async findById(id: string): Promise<ConfigurationVersion | null> {
    return this.store.get(id) ?? null;
  }

  async findByVersion(
    environmentId: string,
    version: number,
  ): Promise<ConfigurationVersion | null> {
    for (const v of this.store.values()) {
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
    this.store.set(version.id, version);
    return version;
  }

  async listByEnvironment(environmentId: string): Promise<ConfigurationVersion[]> {
    return Array.from(this.store.values())
      .filter((v) => v.environmentId === environmentId)
      .sort((a, b) => b.version - a.version);
  }
}

export class PostgresAuditEventRepository implements AuditEventRepository {
  private store = new Map<string, AuditEvent>();

  async findById(id: string): Promise<AuditEvent | null> {
    return this.store.get(id) ?? null;
  }

  async create(input: CreateAuditEventInput): Promise<AuditEvent> {
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
    this.store.set(event.id, event);
    return event;
  }

  async listByOrganization(organizationId: string): Promise<AuditEvent[]> {
    return Array.from(this.store.values())
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async listByResource(resourceType: string, resourceId: string): Promise<AuditEvent[]> {
    return Array.from(this.store.values())
      .filter((e) => e.resourceType === resourceType && e.resourceId === resourceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export class PostgresUserRepository implements UserRepository {
  private store = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.store.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const now = new Date().toISOString();
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(user.id, user);
    return user;
  }

  async listAll(): Promise<User[]> {
    return Array.from(this.store.values());
  }
}

export class PostgresRoleRepository implements RoleRepository {
  private store = new Map<string, Role>();

  async findById(id: string): Promise<Role | null> {
    return this.store.get(id) ?? null;
  }

  async findByName(organizationId: string, name: string): Promise<Role | null> {
    for (const role of this.store.values()) {
      if (role.organizationId === organizationId && role.name === name) {
        return role;
      }
    }
    return null;
  }

  async create(input: CreateRoleInput): Promise<Role> {
    const now = new Date().toISOString();
    const role: Role = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(role.id, role);
    return role;
  }

  async listByOrganization(organizationId: string): Promise<Role[]> {
    return Array.from(this.store.values()).filter((r) => r.organizationId === organizationId);
  }
}

export class PostgresApiKeyRepository implements ApiKeyRepository {
  private store = new Map<string, ApiKey>();

  async findById(id: string): Promise<ApiKey | null> {
    return this.store.get(id) ?? null;
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    for (const key of this.store.values()) {
      if (key.keyHash === keyHash) {
        return key;
      }
    }
    return null;
  }

  async create(input: CreateApiKeyInput): Promise<ApiKey> {
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
    this.store.set(apiKey.id, apiKey);
    return apiKey;
  }

  async listByOrganization(organizationId: string): Promise<ApiKey[]> {
    return Array.from(this.store.values()).filter((k) => k.organizationId === organizationId);
  }

  async listByEnvironment(environmentId: string): Promise<ApiKey[]> {
    return Array.from(this.store.values()).filter((k) => k.environmentId === environmentId);
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

/**
 * Creates a fully instantiated PostgreSQL implementation container
 */
export function createRepositoryContainer(): RepositoryContainer {
  return {
    organizations: new PostgresOrganizationRepository(),
    projects: new PostgresProjectRepository(),
    environments: new PostgresEnvironmentRepository(),
    featureFlags: new PostgresFeatureFlagRepository(),
    targetingRules: new PostgresTargetingRuleRepository(),
    rollouts: new PostgresRolloutRepository(),
    configurationVersions: new PostgresConfigurationVersionRepository(),
    auditEvents: new PostgresAuditEventRepository(),
    users: new PostgresUserRepository(),
    roles: new PostgresRoleRepository(),
    apiKeys: new PostgresApiKeyRepository(),
  };
}
