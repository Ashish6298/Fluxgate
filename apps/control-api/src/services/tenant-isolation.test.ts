import { describe, expect, it, beforeEach } from 'vitest';
import type { AuthIdentity } from '@controlplane/contracts';
import { createRepositoryContainer, type RepositoryContainer } from '@controlplane/database';
import {
  AuthorizationService,
  AuthorizationError,
  ProjectManagementService,
  EnvironmentManagementService,
  FeatureFlagManagementService,
  RolloutManagementService,
} from '../index.js';

describe('PHASE 4.4 — Tenant Isolation (Service Layer & Middleware)', () => {
  let repos: RepositoryContainer;
  let authz: AuthorizationService;
  let projectService: ProjectManagementService;
  let envService: EnvironmentManagementService;
  let flagService: FeatureFlagManagementService;
  let rolloutService: RolloutManagementService;

  // Tenant A identifiers and artifacts
  let tenantAOrgId: string;
  let tenantAProjectId: string;
  let tenantAEnvId: string;
  let tenantAFlagId: string;

  // Tenant B identifiers and artifacts
  let tenantBOrgId: string;
  let tenantBProjectId: string;
  let tenantBEnvId: string;
  let tenantBFlagId: string;

  // User identities
  let tenantAOwner: AuthIdentity;
  let tenantAAdmin: AuthIdentity;
  let tenantADev: AuthIdentity;
  let tenantAViewer: AuthIdentity;

  let tenantBOwner: AuthIdentity;
  let tenantBAdmin: AuthIdentity;
  let tenantBDev: AuthIdentity;
  let tenantBViewer: AuthIdentity;

  beforeEach(async () => {
    repos = createRepositoryContainer();
    authz = new AuthorizationService();

    projectService = new ProjectManagementService(repos, authz);
    envService = new EnvironmentManagementService(repos, authz);
    flagService = new FeatureFlagManagementService(repos, authz);
    rolloutService = new RolloutManagementService(repos, authz);

    // 1. Seed Tenant A Hierarchy
    const orgA = await repos.organizations.create({ name: 'Acme Corp (Tenant A)' });
    tenantAOrgId = orgA.id;

    const projA = await repos.projects.create({
      organizationId: tenantAOrgId,
      name: 'Acme Billing Core',
      key: 'acme-billing',
    });
    tenantAProjectId = projA.id;

    const envA = await repos.environments.create({
      projectId: tenantAProjectId,
      name: 'Acme Production',
      key: 'prod',
      type: 'PRODUCTION',
    });
    tenantAEnvId = envA.id;

    const flagA = await repos.featureFlags.create({
      environmentId: tenantAEnvId,
      key: 'stripe_v3_checkout',
      name: 'Stripe V3 Checkout',
      type: 'BOOLEAN',
      defaultValue: false,
      enabled: true,
    });
    tenantAFlagId = flagA.id;

    // 2. Seed Tenant B Hierarchy
    const orgB = await repos.organizations.create({ name: 'Globex Corp (Tenant B)' });
    tenantBOrgId = orgB.id;

    const projB = await repos.projects.create({
      organizationId: tenantBOrgId,
      name: 'Globex Logistics API',
      key: 'globex-logistics',
    });
    tenantBProjectId = projB.id;

    const envB = await repos.environments.create({
      projectId: tenantBProjectId,
      name: 'Globex Production',
      key: 'prod',
      type: 'PRODUCTION',
    });
    tenantBEnvId = envB.id;

    const flagB = await repos.featureFlags.create({
      environmentId: tenantBEnvId,
      key: 'ai_drone_routing',
      name: 'AI Drone Routing',
      type: 'BOOLEAN',
      defaultValue: false,
      enabled: true,
    });
    tenantBFlagId = flagB.id;

    // Setup Tenant A Identities
    tenantAOwner = {
      userId: '10000000-0000-0000-0000-000000000001',
      email: 'owner@acme.com',
      name: 'Acme Owner',
      organizationId: tenantAOrgId,
      role: 'OWNER',
    };
    tenantAAdmin = {
      userId: '10000000-0000-0000-0000-000000000002',
      email: 'admin@acme.com',
      name: 'Acme Admin',
      organizationId: tenantAOrgId,
      role: 'ADMIN',
    };
    tenantADev = {
      userId: '10000000-0000-0000-0000-000000000003',
      email: 'dev@acme.com',
      name: 'Acme Dev',
      organizationId: tenantAOrgId,
      role: 'DEVELOPER',
    };
    tenantAViewer = {
      userId: '10000000-0000-0000-0000-000000000004',
      email: 'viewer@acme.com',
      name: 'Acme Viewer',
      organizationId: tenantAOrgId,
      role: 'VIEWER',
    };

    // Setup Tenant B Identities
    tenantBOwner = {
      userId: '20000000-0000-0000-0000-000000000001',
      email: 'owner@globex.com',
      name: 'Globex Owner',
      organizationId: tenantBOrgId,
      role: 'OWNER',
    };
    tenantBAdmin = {
      userId: '20000000-0000-0000-0000-000000000002',
      email: 'admin@globex.com',
      name: 'Globex Admin',
      organizationId: tenantBOrgId,
      role: 'ADMIN',
    };
    tenantBDev = {
      userId: '20000000-0000-0000-0000-000000000003',
      email: 'dev@globex.com',
      name: 'Globex Dev',
      organizationId: tenantBOrgId,
      role: 'DEVELOPER',
    };
    tenantBViewer = {
      userId: '20000000-0000-0000-0000-000000000004',
      email: 'viewer@globex.com',
      name: 'Globex Viewer',
      organizationId: tenantBOrgId,
      role: 'VIEWER',
    };
  });

  describe('Invariant: Tenant A CANNOT access Tenant B (Required Tests)', () => {
    describe('1. Cross-organization Project Access (MUST FAIL)', () => {
      it('rejects Tenant A Owner attempting to list Tenant B projects', async () => {
        await expect(projectService.listProjects(tenantAOwner, tenantBOrgId)).rejects.toThrow(
          AuthorizationError,
        );
        await expect(projectService.listProjects(tenantAOwner, tenantBOrgId)).rejects.toThrow(
          /Tenant isolation mismatch/,
        );
      });

      it('rejects Tenant A Owner attempting to read Tenant B project by ID', async () => {
        await expect(
          projectService.getProject(tenantAOwner, tenantBOrgId, tenantBProjectId),
        ).rejects.toThrow(AuthorizationError);
      });

      it('rejects Tenant A Owner attempting to create a project in Tenant B organization', async () => {
        await expect(
          projectService.createProject(tenantAOwner, tenantBOrgId, {
            name: 'Infiltrator Project',
            key: 'infiltrator',
          }),
        ).rejects.toThrow(/Tenant isolation mismatch/);
      });

      it('rejects Tenant A Owner attempting to delete Tenant B project', async () => {
        await expect(
          projectService.deleteProject(tenantAOwner, tenantBOrgId, tenantBProjectId),
        ).rejects.toThrow(/Tenant isolation mismatch/);

        // Verify Tenant B project still exists
        const proj = await repos.projects.findById(tenantBProjectId);
        expect(proj).not.toBeNull();
      });

      it('returns null when Tenant A attempts to get Tenant B project specifying Tenant A organization', async () => {
        // Even if Tenant A puts their own orgId in the request, looking up Tenant B's projectId fails
        const res = await projectService.getProject(tenantAOwner, tenantAOrgId, tenantBProjectId);
        expect(res).toBeNull();
      });
    });

    describe('2. Cross-organization Environment Access (MUST FAIL)', () => {
      it('rejects Tenant A Owner attempting to list environments in Tenant B organization', async () => {
        await expect(
          envService.listEnvironments(tenantAOwner, tenantBOrgId, tenantBProjectId),
        ).rejects.toThrow(/Tenant isolation mismatch/);
      });

      it('rejects Tenant A Admin attempting to get Tenant B environment', async () => {
        await expect(
          envService.getEnvironment(tenantAAdmin, tenantBOrgId, tenantBEnvId),
        ).rejects.toThrow(/Tenant isolation mismatch/);
      });

      it('rejects Tenant A Admin attempting to create an environment in Tenant B organization', async () => {
        await expect(
          envService.createEnvironment(tenantAAdmin, tenantBOrgId, tenantBProjectId, {
            name: 'Malicious Env',
            key: 'malicious-env',
            type: 'DEVELOPMENT',
          }),
        ).rejects.toThrow(/Tenant isolation mismatch/);
      });

      it('rejects creating environment if Tenant A tries to attach to Tenant B project under Tenant A org', async () => {
        await expect(
          envService.createEnvironment(tenantAAdmin, tenantAOrgId, tenantBProjectId, {
            name: 'Hijack Env',
            key: 'hijack-env',
            type: 'DEVELOPMENT',
          }),
        ).rejects.toThrow(/does not exist in organization/);
      });
    });

    describe('3. Cross-organization Feature Flag Access (MUST FAIL)', () => {
      it('rejects Tenant A (Owner, Admin, Dev, Viewer) attempting to list Tenant B flags', async () => {
        const identities = [tenantAOwner, tenantAAdmin, tenantADev, tenantAViewer];

        for (const identity of identities) {
          await expect(flagService.listFlags(identity, tenantBOrgId, tenantBEnvId)).rejects.toThrow(
            /Tenant isolation mismatch/,
          );
        }
      });

      it('rejects Tenant A attempting to read a specific Tenant B feature flag', async () => {
        await expect(flagService.getFlag(tenantAOwner, tenantBOrgId, tenantBFlagId)).rejects.toThrow(
          /Tenant isolation mismatch/,
        );
        await expect(flagService.getFlag(tenantADev, tenantBOrgId, tenantBFlagId)).rejects.toThrow(
          /Tenant isolation mismatch/,
        );
      });

      it('rejects Tenant A attempting to create a flag in Tenant B environment', async () => {
        await expect(
          flagService.createFlag(tenantAAdmin, tenantBOrgId, {
            environmentId: tenantBEnvId,
            key: 'cross_tenant_flag',
            name: 'Cross Tenant Flag',
            type: 'BOOLEAN',
            defaultValue: false,
          }),
        ).rejects.toThrow(/Tenant isolation mismatch/);
      });

      it('rejects Tenant A attempting to modify a Tenant B flag', async () => {
        await expect(
          flagService.updateFlag(tenantAAdmin, tenantBOrgId, tenantBFlagId, {
            enabled: false,
          }),
        ).rejects.toThrow(/Tenant isolation mismatch/);

        // Verify flag remains unchanged
        const flag = await repos.featureFlags.findById(tenantBFlagId);
        expect(flag?.enabled).toBe(true);
      });

      it('rejects Tenant A attempting to delete a Tenant B flag', async () => {
        await expect(
          flagService.deleteFlag(tenantAOwner, tenantBOrgId, tenantBFlagId),
        ).rejects.toThrow(/Tenant isolation mismatch/);

        // Verify flag was not deleted
        const flag = await repos.featureFlags.findById(tenantBFlagId);
        expect(flag).not.toBeNull();
      });
    });

    describe('4. Cross-organization Rollout and Rollback (MUST FAIL)', () => {
      it('rejects Tenant A attempting to execute a rollout on Tenant B flag', async () => {
        await expect(
          rolloutService.executeRollout(
            tenantAOwner,
            tenantBOrgId,
            {
              featureFlagId: tenantBFlagId,
              percentage: 100,
              salt: 'malicious-salt',
            },
            'PRODUCTION',
          ),
        ).rejects.toThrow(/Tenant isolation mismatch/);
      });

      it('rejects Tenant A attempting to rollback Tenant B configuration', async () => {
        await expect(
          rolloutService.rollback(tenantAOwner, tenantBOrgId, 'version-999'),
        ).rejects.toThrow(/Tenant isolation mismatch/);
      });
    });

    describe('5. Symmetric Verification: Tenant B CANNOT access Tenant A', () => {
      it('rejects Tenant B attempting to access Tenant A projects', async () => {
        await expect(projectService.listProjects(tenantBOwner, tenantAOrgId)).rejects.toThrow(
          /Tenant isolation mismatch/,
        );
      });

      it('rejects Tenant B attempting to access Tenant A environments', async () => {
        await expect(
          envService.listEnvironments(tenantBAdmin, tenantAOrgId, tenantAProjectId),
        ).rejects.toThrow(/Tenant isolation mismatch/);
      });

      it('rejects Tenant B attempting to access Tenant A feature flags', async () => {
        await expect(flagService.listFlags(tenantBDev, tenantAOrgId, tenantAEnvId)).rejects.toThrow(
          /Tenant isolation mismatch/,
        );
        await expect(
          flagService.getFlag(tenantBViewer, tenantAOrgId, tenantAFlagId),
        ).rejects.toThrow(/Tenant isolation mismatch/);
      });
    });

    describe('6. Non-organization Identities (MUST FAIL)', () => {
      it('rejects access from identity with undefined organizationId', async () => {
        const noOrgIdentity: AuthIdentity = {
          userId: '30000000-0000-0000-0000-000000000001',
          email: 'anonymous@nowhere.com',
          name: 'No Org User',
          organizationId: undefined,
          role: 'DEVELOPER',
        };

        await expect(projectService.listProjects(noOrgIdentity, tenantAOrgId)).rejects.toThrow(
          /Caller has no active organization context/,
        );
      });
    });
  });
});
