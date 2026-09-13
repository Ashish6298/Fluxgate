import { z } from 'zod';
import {
  FlagType,
  FlagTypeSchema,
  Organization,
  OrganizationSchema,
  CreateOrganizationInput,
  CreateOrganizationInputSchema,
  UpdateOrganizationInput,
  UpdateOrganizationInputSchema,
  Project,
  ProjectSchema,
  ProjectIdSchema,
  ProjectNameSchema,
  OrganizationIdSchema,
  OrganizationNameSchema,
  CreateProjectInput,
  CreateProjectInputSchema,
  UpdateProjectInput,
  UpdateProjectInputSchema,
  ProjectKeySchema,
  Environment,
  EnvironmentType,
  EnvironmentSchema,
  EnvironmentIdSchema,
  EnvironmentKeySchema,
  EnvironmentNameSchema,
  EnvironmentTypeSchema,
  CreateEnvironmentInput,
  CreateEnvironmentInputSchema,
  UpdateEnvironmentInput,
  UpdateEnvironmentInputSchema,
  FeatureFlag,
  FeatureFlagValue,
  FeatureFlagSchema,
  FeatureFlagIdSchema,
  FeatureFlagKeySchema,
  FeatureFlagNameSchema,
  FeatureFlagDescriptionSchema,
  FeatureFlagValueSchema,
  CreateFeatureFlagInput,
  CreateFeatureFlagInputSchema,
  UpdateFeatureFlagInput,
  UpdateFeatureFlagInputSchema,
  isValidFlagValue,
  TargetingRule,
  RuleCondition,
  RuleOperator,
  TargetingRuleSchema,
  TargetingRuleIdSchema,
  RuleConditionSchema,
  RuleOperatorSchema,
  CreateTargetingRuleInput,
  CreateTargetingRuleInputSchema,
  UpdateTargetingRuleInput,
  UpdateTargetingRuleInputSchema,
} from '@controlplane/contracts';
import { randomUUID } from 'node:crypto';

export {
  type FlagType,
  type Organization,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type Project,
  type CreateProjectInput,
  type UpdateProjectInput,
  type Environment,
  type EnvironmentType,
  type CreateEnvironmentInput,
  type UpdateEnvironmentInput,
  type FeatureFlag,
  type FeatureFlagValue,
  type CreateFeatureFlagInput,
  type UpdateFeatureFlagInput,
  type TargetingRule,
  type RuleCondition,
  type RuleOperator,
  type CreateTargetingRuleInput,
  type UpdateTargetingRuleInput,
  FlagTypeSchema,
  OrganizationSchema,
  OrganizationIdSchema,
  OrganizationNameSchema,
  CreateOrganizationInputSchema,
  UpdateOrganizationInputSchema,
  ProjectSchema,
  ProjectIdSchema,
  ProjectNameSchema,
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  ProjectKeySchema,
  EnvironmentSchema,
  EnvironmentIdSchema,
  EnvironmentKeySchema,
  EnvironmentNameSchema,
  EnvironmentTypeSchema,
  CreateEnvironmentInputSchema,
  UpdateEnvironmentInputSchema,
  FeatureFlagSchema,
  FeatureFlagIdSchema,
  FeatureFlagKeySchema,
  FeatureFlagNameSchema,
  FeatureFlagDescriptionSchema,
  FeatureFlagValueSchema,
  CreateFeatureFlagInputSchema,
  UpdateFeatureFlagInputSchema,
  isValidFlagValue,
  TargetingRuleSchema,
  TargetingRuleIdSchema,
  RuleConditionSchema,
  RuleOperatorSchema,
  CreateTargetingRuleInputSchema,
  UpdateTargetingRuleInputSchema,
};

// --- Organization Domain Entity & Helpers ---

export interface CreateOrganizationOptions {
  name: string;
  id?: string;
  now?: string;
}

/**
 * Creates a validated Organization domain model.
 */
export function createOrganization(options: CreateOrganizationOptions): Organization {
  const parsedInput = CreateOrganizationInputSchema.parse({ name: options.name });
  const id = options.id ?? randomUUID();
  const timestamp = options.now ?? new Date().toISOString();

  return OrganizationSchema.parse({
    id,
    name: parsedInput.name,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Immutably updates an Organization's name and increments updatedAt.
 */
export function updateOrganization(
  org: Organization,
  input: UpdateOrganizationInput,
  now?: string,
): Organization {
  const parsed = UpdateOrganizationInputSchema.parse(input);
  const timestamp = now ?? new Date().toISOString();

  return OrganizationSchema.parse({
    ...org,
    name: parsed.name,
    updatedAt: timestamp,
  });
}

/**
 * In-memory Organization Registry enforcing tenant identifier uniqueness.
 */
export class InMemoryOrganizationRepository {
  private organizations = new Map<string, Organization>();

  async create(input: CreateOrganizationInput, id?: string): Promise<Organization> {
    const orgId = id ?? randomUUID();
    if (this.organizations.has(orgId)) {
      throw new Error(`Organization with ID '${orgId}' already exists`);
    }

    const org = createOrganization({ name: input.name, id: orgId });
    this.organizations.set(org.id, org);
    return org;
  }

  async findById(id: string): Promise<Organization | null> {
    return this.organizations.get(id) ?? null;
  }

  async list(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    const org = await this.findById(id);
    if (!org) {
      throw new Error(`Organization with ID '${id}' not found`);
    }

    const updated = updateOrganization(org, input);
    this.organizations.set(updated.id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.organizations.delete(id);
  }
}

// --- Project Domain Entity & Helpers ---

export interface CreateProjectOptions {
  organizationId: string;
  name: string;
  key: string;
  id?: string;
  now?: string;
}

/**
 * Creates a validated Project domain model.
 */
export function createProject(options: CreateProjectOptions): Project {
  const parsedInput = CreateProjectInputSchema.parse({
    organizationId: options.organizationId,
    name: options.name,
    key: options.key,
  });
  const id = options.id ?? randomUUID();
  const timestamp = options.now ?? new Date().toISOString();

  return ProjectSchema.parse({
    id,
    organizationId: parsedInput.organizationId,
    name: parsedInput.name,
    key: parsedInput.key,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Immutably updates a Project's mutable fields (e.g. name) and increments updatedAt.
 * Note: Project key and organizationId are immutable invariants.
 */
export function updateProject(project: Project, input: UpdateProjectInput, now?: string): Project {
  const parsed = UpdateProjectInputSchema.parse(input);
  const timestamp = now ?? new Date().toISOString();

  return ProjectSchema.parse({
    ...project,
    name: parsed.name,
    updatedAt: timestamp,
  });
}

export interface ProjectRepository {
  create(input: CreateProjectInput, id?: string): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  findByKey(organizationId: string, key: string): Promise<Project | null>;
  listByOrganization(organizationId: string): Promise<Project[]>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  delete(id: string): Promise<boolean>;
}

/**
 * In-memory Project Repository enforcing:
 * 1. Global Project ID uniqueness
 * 2. Scoped Project Key uniqueness per Organization (organizationId + key)
 */
export class InMemoryProjectRepository implements ProjectRepository {
  private projects = new Map<string, Project>();

  async create(input: CreateProjectInput, id?: string): Promise<Project> {
    const projectId = id ?? randomUUID();
    if (this.projects.has(projectId)) {
      throw new Error(`Project with ID '${projectId}' already exists`);
    }

    // Check organizationId + key compound uniqueness
    const existing = await this.findByKey(input.organizationId, input.key);
    if (existing) {
      throw new Error(
        `Project with key '${input.key}' already exists in organization '${input.organizationId}'`,
      );
    }

    const project = createProject({
      organizationId: input.organizationId,
      name: input.name,
      key: input.key,
      id: projectId,
    });
    this.projects.set(project.id, project);
    return project;
  }

  async findById(id: string): Promise<Project | null> {
    return this.projects.get(id) ?? null;
  }

  async findByKey(organizationId: string, key: string): Promise<Project | null> {
    for (const project of this.projects.values()) {
      if (project.organizationId === organizationId && project.key === key) {
        return project;
      }
    }
    return null;
  }

  async listByOrganization(organizationId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter((p) => p.organizationId === organizationId);
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const project = await this.findById(id);
    if (!project) {
      throw new Error(`Project with ID '${id}' not found`);
    }

    const updated = updateProject(project, input);
    this.projects.set(updated.id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }
}

// --- Environment Domain Entity & Helpers ---

export interface CreateEnvironmentOptions {
  projectId: string;
  name: string;
  key: string;
  type?: EnvironmentType;
  id?: string;
  now?: string;
}

/**
 * Creates a validated Environment domain model.
 */
export function createEnvironment(options: CreateEnvironmentOptions): Environment {
  const parsedInput = CreateEnvironmentInputSchema.parse({
    projectId: options.projectId,
    name: options.name,
    key: options.key,
    type: options.type ?? 'CUSTOM',
  });
  const id = options.id ?? randomUUID();
  const timestamp = options.now ?? new Date().toISOString();

  return EnvironmentSchema.parse({
    id,
    projectId: parsedInput.projectId,
    name: parsedInput.name,
    key: parsedInput.key,
    type: parsedInput.type,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Immutably updates an Environment's mutable fields (e.g. name, type) and increments updatedAt.
 * Note: Environment key and projectId are immutable invariants.
 */
export function updateEnvironment(
  env: Environment,
  input: UpdateEnvironmentInput,
  now?: string,
): Environment {
  const parsed = UpdateEnvironmentInputSchema.parse(input);
  const timestamp = now ?? new Date().toISOString();

  return EnvironmentSchema.parse({
    ...env,
    name: parsed.name ?? env.name,
    type: parsed.type ?? env.type,
    updatedAt: timestamp,
  });
}

export interface EnvironmentRepository {
  create(input: CreateEnvironmentInput, id?: string): Promise<Environment>;
  findById(id: string): Promise<Environment | null>;
  findByKey(projectId: string, key: string): Promise<Environment | null>;
  listByProject(projectId: string): Promise<Environment[]>;
  update(id: string, input: UpdateEnvironmentInput): Promise<Environment>;
  delete(id: string): Promise<boolean>;
}

/**
 * In-memory Environment Repository enforcing:
 * 1. Global Environment ID uniqueness
 * 2. Scoped Environment Key uniqueness per Project (projectId + key)
 */
export class InMemoryEnvironmentRepository implements EnvironmentRepository {
  private environments = new Map<string, Environment>();

  async create(input: CreateEnvironmentInput, id?: string): Promise<Environment> {
    const envId = id ?? randomUUID();
    if (this.environments.has(envId)) {
      throw new Error(`Environment with ID '${envId}' already exists`);
    }

    // Check projectId + key compound uniqueness
    const existing = await this.findByKey(input.projectId, input.key);
    if (existing) {
      throw new Error(
        `Environment with key '${input.key}' already exists in project '${input.projectId}'`,
      );
    }

    const env = createEnvironment({
      projectId: input.projectId,
      name: input.name,
      key: input.key,
      type: input.type,
      id: envId,
    });
    this.environments.set(env.id, env);
    return env;
  }

  async findById(id: string): Promise<Environment | null> {
    return this.environments.get(id) ?? null;
  }

  async findByKey(projectId: string, key: string): Promise<Environment | null> {
    for (const env of this.environments.values()) {
      if (env.projectId === projectId && env.key === key) {
        return env;
      }
    }
    return null;
  }

  async listByProject(projectId: string): Promise<Environment[]> {
    return Array.from(this.environments.values()).filter((e) => e.projectId === projectId);
  }

  async update(id: string, input: UpdateEnvironmentInput): Promise<Environment> {
    const env = await this.findById(id);
    if (!env) {
      throw new Error(`Environment with ID '${id}' not found`);
    }

    const updated = updateEnvironment(env, input);
    this.environments.set(updated.id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.environments.delete(id);
  }
}

// --- Feature Flag Domain Entity & Helpers ---

export interface CreateFeatureFlagOptions {
  environmentId: string;
  key: string;
  name: string;
  description?: string;
  type: FlagType;
  defaultValue: FeatureFlagValue;
  enabled?: boolean;
  id?: string;
  now?: string;
}

/**
 * Creates a validated FeatureFlag domain model.
 */
export function createFeatureFlag(options: CreateFeatureFlagOptions): FeatureFlag {
  const parsedInput = CreateFeatureFlagInputSchema.parse({
    environmentId: options.environmentId,
    key: options.key,
    name: options.name,
    description: options.description,
    type: options.type,
    defaultValue: options.defaultValue,
    enabled: options.enabled ?? true,
  });
  const id = options.id ?? randomUUID();
  const timestamp = options.now ?? new Date().toISOString();

  return FeatureFlagSchema.parse({
    id,
    environmentId: parsedInput.environmentId,
    key: parsedInput.key,
    name: parsedInput.name,
    description: parsedInput.description,
    type: parsedInput.type,
    defaultValue: parsedInput.defaultValue,
    enabled: parsedInput.enabled,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Immutably updates a FeatureFlag (e.g. name, description, defaultValue, enabled) and increments updatedAt.
 * Note: Flag key, environmentId, and type are immutable invariants.
 */
export function updateFeatureFlag(
  flag: FeatureFlag,
  input: UpdateFeatureFlagInput,
  now?: string,
): FeatureFlag {
  const parsed = UpdateFeatureFlagInputSchema.parse(input);
  const timestamp = now ?? new Date().toISOString();

  const newDefaultValue =
    parsed.defaultValue !== undefined ? parsed.defaultValue : flag.defaultValue;
  if (!isValidFlagValue(flag.type, newDefaultValue)) {
    throw new Error(`defaultValue does not match flag type '${flag.type}'`);
  }

  return FeatureFlagSchema.parse({
    ...flag,
    name: parsed.name ?? flag.name,
    description: parsed.description !== undefined ? parsed.description : flag.description,
    defaultValue: newDefaultValue,
    enabled: parsed.enabled !== undefined ? parsed.enabled : flag.enabled,
    updatedAt: timestamp,
  });
}

export interface FeatureFlagRepository {
  create(input: CreateFeatureFlagInput, id?: string): Promise<FeatureFlag>;
  findById(id: string): Promise<FeatureFlag | null>;
  findByKey(environmentId: string, key: string): Promise<FeatureFlag | null>;
  listByEnvironment(environmentId: string): Promise<FeatureFlag[]>;
  update(id: string, input: UpdateFeatureFlagInput): Promise<FeatureFlag>;
  delete(id: string): Promise<boolean>;
}

/**
 * In-memory Feature Flag Repository enforcing:
 * 1. Global Feature Flag ID uniqueness
 * 2. Scoped Feature Flag Key uniqueness per Environment (environmentId + key)
 */
export class InMemoryFeatureFlagRepository implements FeatureFlagRepository {
  private flags = new Map<string, FeatureFlag>();

  async create(input: CreateFeatureFlagInput, id?: string): Promise<FeatureFlag> {
    const flagId = id ?? randomUUID();
    if (this.flags.has(flagId)) {
      throw new Error(`Feature Flag with ID '${flagId}' already exists`);
    }

    // Check environmentId + key compound uniqueness
    const existing = await this.findByKey(input.environmentId, input.key);
    if (existing) {
      throw new Error(
        `Feature Flag with key '${input.key}' already exists in environment '${input.environmentId}'`,
      );
    }

    const flag = createFeatureFlag({
      environmentId: input.environmentId,
      key: input.key,
      name: input.name,
      description: input.description,
      type: input.type,
      defaultValue: input.defaultValue,
      enabled: input.enabled,
      id: flagId,
    });
    this.flags.set(flag.id, flag);
    return flag;
  }

  async findById(id: string): Promise<FeatureFlag | null> {
    return this.flags.get(id) ?? null;
  }

  async findByKey(environmentId: string, key: string): Promise<FeatureFlag | null> {
    for (const flag of this.flags.values()) {
      if (flag.environmentId === environmentId && flag.key === key) {
        return flag;
      }
    }
    return null;
  }

  async listByEnvironment(environmentId: string): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values()).filter((f) => f.environmentId === environmentId);
  }

  async update(id: string, input: UpdateFeatureFlagInput): Promise<FeatureFlag> {
    const flag = await this.findById(id);
    if (!flag) {
      throw new Error(`Feature Flag with ID '${id}' not found`);
    }

    const updated = updateFeatureFlag(flag, input);
    this.flags.set(updated.id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.flags.delete(id);
  }
}

// --- Targeting Rule Domain Entity & Helpers ---

export interface CreateTargetingRuleOptions {
  featureFlagId: string;
  priority?: number;
  conditions: RuleCondition[];
  value: FeatureFlagValue;
  enabled?: boolean;
  id?: string;
  now?: string;
}

/**
 * Creates a validated TargetingRule domain model.
 */
export function createTargetingRule(options: CreateTargetingRuleOptions): TargetingRule {
  const parsedInput = CreateTargetingRuleInputSchema.parse({
    featureFlagId: options.featureFlagId,
    priority: options.priority ?? 0,
    conditions: options.conditions,
    value: options.value,
    enabled: options.enabled ?? true,
  });
  const id = options.id ?? randomUUID();
  const timestamp = options.now ?? new Date().toISOString();

  return TargetingRuleSchema.parse({
    id,
    featureFlagId: parsedInput.featureFlagId,
    priority: parsedInput.priority,
    conditions: parsedInput.conditions,
    value: parsedInput.value,
    enabled: parsedInput.enabled,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Immutably updates a TargetingRule (priority, conditions, value, enabled) and increments updatedAt.
 * Note: Targeting rule ID and featureFlagId are immutable invariants.
 */
export function updateTargetingRule(
  rule: TargetingRule,
  input: UpdateTargetingRuleInput,
  now?: string,
): TargetingRule {
  const parsed = UpdateTargetingRuleInputSchema.parse(input);
  const timestamp = now ?? new Date().toISOString();

  return TargetingRuleSchema.parse({
    ...rule,
    priority: parsed.priority !== undefined ? parsed.priority : rule.priority,
    conditions: parsed.conditions !== undefined ? parsed.conditions : rule.conditions,
    value: parsed.value !== undefined ? parsed.value : rule.value,
    enabled: parsed.enabled !== undefined ? parsed.enabled : rule.enabled,
    updatedAt: timestamp,
  });
}

export interface TargetingRuleRepository {
  create(input: CreateTargetingRuleInput, id?: string): Promise<TargetingRule>;
  findById(id: string): Promise<TargetingRule | null>;
  listByFeatureFlag(featureFlagId: string): Promise<TargetingRule[]>;
  update(id: string, input: UpdateTargetingRuleInput): Promise<TargetingRule>;
  delete(id: string): Promise<boolean>;
}

/**
 * In-memory Targeting Rule Repository enforcing:
 * 1. Global Targeting Rule ID uniqueness
 * 2. Scoped listing by featureFlagId sorted by priority ascending
 */
export class InMemoryTargetingRuleRepository implements TargetingRuleRepository {
  private rules = new Map<string, TargetingRule>();

  async create(input: CreateTargetingRuleInput, id?: string): Promise<TargetingRule> {
    const ruleId = id ?? randomUUID();
    if (this.rules.has(ruleId)) {
      throw new Error(`Targeting Rule with ID '${ruleId}' already exists`);
    }

    const rule = createTargetingRule({
      featureFlagId: input.featureFlagId,
      priority: input.priority,
      conditions: input.conditions,
      value: input.value,
      enabled: input.enabled,
      id: ruleId,
    });
    this.rules.set(rule.id, rule);
    return rule;
  }

  async findById(id: string): Promise<TargetingRule | null> {
    return this.rules.get(id) ?? null;
  }

  async listByFeatureFlag(featureFlagId: string): Promise<TargetingRule[]> {
    return Array.from(this.rules.values())
      .filter((r) => r.featureFlagId === featureFlagId)
      .sort((a, b) => a.priority - b.priority);
  }

  async update(id: string, input: UpdateTargetingRuleInput): Promise<TargetingRule> {
    const rule = await this.findById(id);
    if (!rule) {
      throw new Error(`Targeting Rule with ID '${id}' not found`);
    }

    const updated = updateTargetingRule(rule, input);
    this.rules.set(updated.id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.rules.delete(id);
  }
}

// --- Configuration Snapshot Models ---

export const ConfigurationSnapshotSchema = z.object({
  schemaVersion: z.number().int().positive(),
  projectKey: z.string().min(1),
  environmentKey: z.string().min(1),
  configurationVersion: z.number().int().nonnegative(),
  checksum: z.string().min(1),
  flags: z.array(FeatureFlagSchema),
});
export type ConfigurationSnapshot = z.infer<typeof ConfigurationSnapshotSchema>;
