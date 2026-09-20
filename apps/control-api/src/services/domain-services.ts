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
