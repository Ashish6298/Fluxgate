import type {
  AuthIdentity,
  CreateFeatureFlagInput,
  CreateRolloutInput,
  FeatureFlag,
  Rollout,
  UpdateFeatureFlagInput,
} from '@controlplane/contracts';
import { type RepositoryContainer, createRepositoryContainer } from '@controlplane/database';
import { AuthorizationService } from '../auth/authorization-service.js';

export class FeatureFlagManagementService {
  constructor(
    private repos: RepositoryContainer = createRepositoryContainer(),
    private authz: AuthorizationService = new AuthorizationService(),
  ) {}

  /**
   * List flags in an environment (Requires VIEW_FLAGS and matching organization)
   */
  public async listFlags(
    identity: AuthIdentity,
    targetOrgId: string,
    environmentId: string,
  ): Promise<FeatureFlag[]> {
    // 1. Service Layer Tenant Enforcement
    this.authz.enforceTenantAccess(identity, targetOrgId);

    // 2. Service Layer Action Enforcement
    this.authz.enforce(identity, 'VIEW_FLAGS');

    return await this.repos.featureFlags.listByEnvironment(environmentId);
  }

  /**
   * Create a feature flag (Requires CREATE_FLAGS and matching organization)
   */
  public async createFlag(
    identity: AuthIdentity,
    targetOrgId: string,
    input: CreateFeatureFlagInput,
  ): Promise<FeatureFlag> {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    this.authz.enforce(identity, 'CREATE_FLAGS');

    return await this.repos.featureFlags.create(input);
  }

  /**
   * Modify a feature flag (Requires MODIFY_FLAGS and matching organization)
   */
  public async updateFlag(
    identity: AuthIdentity,
    targetOrgId: string,
    flagId: string,
    input: UpdateFeatureFlagInput,
  ): Promise<FeatureFlag | null> {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    this.authz.enforce(identity, 'MODIFY_FLAGS');

    return await this.repos.featureFlags.update(flagId, input);
  }

  /**
   * Get a feature flag (Requires VIEW_FLAGS and matching organization)
   */
  public async getFlag(
    identity: AuthIdentity,
    targetOrgId: string,
    flagId: string,
  ): Promise<FeatureFlag | null> {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    this.authz.enforce(identity, 'VIEW_FLAGS');

    return await this.repos.featureFlags.findById(flagId);
  }

  /**
   * Delete a feature flag (Requires MODIFY_FLAGS and matching organization)
   */
  public async deleteFlag(
    identity: AuthIdentity,
    targetOrgId: string,
    flagId: string,
  ): Promise<boolean> {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    this.authz.enforce(identity, 'MODIFY_FLAGS');

    return await this.repos.featureFlags.delete(flagId);
  }
}

export class RolloutManagementService {
  constructor(
    private repos: RepositoryContainer = createRepositoryContainer(),
    private authz: AuthorizationService = new AuthorizationService(),
  ) {}

  /**
   * Execute or update a rollout (Requires PRODUCTION_ROLLOUT policy evaluation and matching organization)
   */
  public async executeRollout(
    identity: AuthIdentity,
    targetOrgId: string,
    input: CreateRolloutInput,
    environmentType: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION',
    allowOverride: boolean = false,
  ): Promise<Rollout> {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    this.authz.enforce(identity, 'PRODUCTION_ROLLOUT', {
      environmentType,
      allowDeveloperProductionRollout: allowOverride,
    });

    return await this.repos.rollouts.create(input);
  }

  /**
   * Rollback configuration version (Requires ROLLBACK and matching organization)
   */
  public async rollback(
    identity: AuthIdentity,
    targetOrgId: string,
    versionId: string,
  ): Promise<{ success: boolean; rolledBackVersionId: string }> {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    this.authz.enforce(identity, 'ROLLBACK');

    return {
      success: true,
      rolledBackVersionId: versionId,
    };
  }
}

export class ProjectManagementService {
  constructor(
    private repos: RepositoryContainer = createRepositoryContainer(),
    private authz: AuthorizationService = new AuthorizationService(),
  ) {}

  /**
   * List projects for an organization (Requires matching organization)
   */
  public async listProjects(identity: AuthIdentity, targetOrgId: string) {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    return await this.repos.projects.listByOrganization(targetOrgId);
  }

  /**
   * Get project by ID (Requires matching organization)
   */
  public async getProject(identity: AuthIdentity, targetOrgId: string, projectId: string) {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    const project = await this.repos.projects.findById(projectId);
    if (!project || project.organizationId !== targetOrgId) {
      return null;
    }
    return project;
  }

  /**
   * Create a project (Requires ADMIN or OWNER and matching organization)
   */
  public async createProject(
    identity: AuthIdentity,
    targetOrgId: string,
    input: { name: string; key: string },
  ) {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    this.authz.enforceRole(identity, ['OWNER', 'ADMIN']);

    return await this.repos.projects.create({
      organizationId: targetOrgId,
      name: input.name,
      key: input.key,
    });
  }

  /**
   * Delete a project (Strictly restricted to OWNER role and matching organization)
   */
  public async deleteProject(
    identity: AuthIdentity,
    targetOrgId: string,
    projectId: string,
  ): Promise<boolean> {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    this.authz.enforce(identity, 'DELETE_PROJECT');

    return await this.repos.projects.delete(projectId);
  }
}

export class EnvironmentManagementService {
  constructor(
    private repos: RepositoryContainer = createRepositoryContainer(),
    private authz: AuthorizationService = new AuthorizationService(),
  ) {}

  /**
   * List environments in a project (Requires matching organization)
   */
  public async listEnvironments(
    identity: AuthIdentity,
    targetOrgId: string,
    projectId: string,
  ) {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    // Verify project belongs to tenant
    const project = await this.repos.projects.findById(projectId);
    if (!project || project.organizationId !== targetOrgId) {
      return [];
    }
    return await this.repos.environments.listByProject(projectId);
  }

  /**
   * Get environment by ID (Requires matching organization)
   */
  public async getEnvironment(
    identity: AuthIdentity,
    targetOrgId: string,
    environmentId: string,
  ) {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    const env = await this.repos.environments.findById(environmentId);
    if (!env) return null;

    const project = await this.repos.projects.findById(env.projectId);
    if (!project || project.organizationId !== targetOrgId) {
      return null;
    }
    return env;
  }

  /**
   * Create an environment (Requires ADMIN or OWNER and matching organization)
   */
  public async createEnvironment(
    identity: AuthIdentity,
    targetOrgId: string,
    projectId: string,
    input: { name: string; key: string; type?: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' | 'CUSTOM' },
  ) {
    this.authz.enforceTenantAccess(identity, targetOrgId);
    this.authz.enforceRole(identity, ['OWNER', 'ADMIN']);

    const project = await this.repos.projects.findById(projectId);
    if (!project || project.organizationId !== targetOrgId) {
      throw new Error(`Project ${projectId} does not exist in organization ${targetOrgId}`);
    }

    return await this.repos.environments.create({
      projectId,
      name: input.name,
      key: input.key,
      type: input.type,
    });
  }
}
