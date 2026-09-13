import { z } from 'zod';
import {
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
} from '@controlplane/contracts';
import { randomUUID } from 'node:crypto';

export {
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

// --- Feature Flag & Configuration Snapshot Models ---

export const FeatureFlagModelSchema = z.object({
  id: z.string(),
  key: z.string().min(1),
  name: z.string(),
  description: z.string().optional(),
  type: FlagTypeSchema,
  defaultValue: z.union([z.boolean(), z.string(), z.number(), z.record(z.unknown())]),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FeatureFlagModel = z.infer<typeof FeatureFlagModelSchema>;

export const ConfigurationSnapshotSchema = z.object({
  schemaVersion: z.number().int().positive(),
  projectKey: z.string().min(1),
  environmentKey: z.string().min(1),
  configurationVersion: z.number().int().nonnegative(),
  checksum: z.string().min(1),
  flags: z.array(FeatureFlagModelSchema),
});
export type ConfigurationSnapshot = z.infer<typeof ConfigurationSnapshotSchema>;
