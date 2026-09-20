import { describe, expect, it, beforeEach } from 'vitest';
import type { AuthIdentity } from '@controlplane/contracts';
import { createRepositoryContainer, type RepositoryContainer } from '@controlplane/database';
import {
  AuthorizationService,
  AuthorizationError,
  FeatureFlagManagementService,
  RolloutManagementService,
  ProjectManagementService,
} from '../index.js';

describe('Service-Layer Authorization Layer (Phase 4.3)', () => {
  let repos: RepositoryContainer;
  let flagService: FeatureFlagManagementService;
  let rolloutService: RolloutManagementService;
  let projectService: ProjectManagementService;

  const orgA = '00000000-0000-0000-0000-000000000001';
  const orgB = '00000000-0000-0000-0000-000000000002';
  let projectId: string;
  let envId: string;
  let flagId: string;

  const ownerIdentity: AuthIdentity = {
    userId: '00000000-0000-0000-0000-000000000101',
    email: 'owner@tenant-a.com',
    name: 'Owner User',
    organizationId: orgA,
    role: 'OWNER',
  };

  const adminIdentity: AuthIdentity = {
    userId: '00000000-0000-0000-0000-000000000102',
    email: 'admin@tenant-a.com',
    name: 'Admin User',
    organizationId: orgA,
    role: 'ADMIN',
  };

  const devIdentity: AuthIdentity = {
    userId: '00000000-0000-0000-0000-000000000103',
    email: 'dev@tenant-a.com',
    name: 'Dev User',
    organizationId: orgA,
    role: 'DEVELOPER',
  };

  const viewerIdentity: AuthIdentity = {
    userId: '00000000-0000-0000-0000-000000000104',
    email: 'viewer@tenant-a.com',
    name: 'Viewer User',
    organizationId: orgA,
    role: 'VIEWER',
  };

  beforeEach(async () => {
    repos = createRepositoryContainer();
    const authz = new AuthorizationService();
    flagService = new FeatureFlagManagementService(repos, authz);
    rolloutService = new RolloutManagementService(repos, authz);
    projectService = new ProjectManagementService(repos, authz);

    // Bootstrap DB entities
    const org = await repos.organizations.create({ name: 'Tenant A' });
    const project = await repos.projects.create({
      organizationId: org.id,
      name: 'Project A',
      key: 'proj-a',
    });
    projectId = project.id;

    // Use org.id as the target organization
    ownerIdentity.organizationId = org.id;
    adminIdentity.organizationId = org.id;
    devIdentity.organizationId = org.id;
    viewerIdentity.organizationId = org.id;

    const env = await repos.environments.create({
      projectId,
      name: 'Dev Env',
      key: 'dev',
      type: 'DEVELOPMENT',
    });
    envId = env.id;

    const flag = await repos.featureFlags.create({
      environmentId: envId,
      key: 'base_flag',
      name: 'Base Flag',
      type: 'BOOLEAN',
      defaultValue: false,
      enabled: true,
    });
    flagId = flag.id;
  });

  describe('AuthorizationService Unit Tests', () => {
    const authz = new AuthorizationService();

    it('should validate direct role enforcement', () => {
      expect(() => authz.enforceRole(ownerIdentity, ['OWNER', 'ADMIN'])).not.toThrow();
      expect(() => authz.enforceRole(viewerIdentity, ['OWNER', 'ADMIN'])).toThrow(
        AuthorizationError,
      );
    });
  });

  describe('FeatureFlagManagementService Authorization', () => {
    it('should allow all roles in the organization to view flags at the service layer', async () => {
      const targetOrg = ownerIdentity.organizationId!;
      await expect(flagService.listFlags(ownerIdentity, targetOrg, envId)).resolves.toHaveLength(1);
      await expect(flagService.listFlags(adminIdentity, targetOrg, envId)).resolves.toHaveLength(1);
      await expect(flagService.listFlags(devIdentity, targetOrg, envId)).resolves.toHaveLength(1);
      await expect(flagService.listFlags(viewerIdentity, targetOrg, envId)).resolves.toHaveLength(
        1,
      );
    });

    it('should block viewer from creating or modifying flags at the service layer', async () => {
      const targetOrg = ownerIdentity.organizationId!;
      await expect(
        flagService.createFlag(viewerIdentity, targetOrg, {
          environmentId: envId,
          key: 'new_feature',
          name: 'New Feature',
          type: 'BOOLEAN',
          defaultValue: false,
          enabled: true,
        }),
      ).rejects.toThrow(AuthorizationError);

      await expect(
        flagService.updateFlag(viewerIdentity, targetOrg, flagId, {
          name: 'Updated Name',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('should allow developer to create flags at the service layer', async () => {
      const targetOrg = ownerIdentity.organizationId!;
      const created = await flagService.createFlag(devIdentity, targetOrg, {
        environmentId: envId,
        key: 'dev_flag',
        name: 'Dev Flag',
        type: 'BOOLEAN',
        defaultValue: true,
        enabled: true,
      });

      expect(created.key).toBe('dev_flag');
    });

    it('should enforce tenant isolation at the service layer when accessing foreign organization', async () => {
      await expect(flagService.listFlags(ownerIdentity, orgB, envId)).rejects.toThrow(
        /Tenant isolation mismatch/,
      );
    });
  });

  describe('RolloutManagementService Authorization & Policy Enforcement', () => {
    it('should permit developer rollout in non-production environments', async () => {
      const targetOrg = ownerIdentity.organizationId!;
      const rollout = await rolloutService.executeRollout(
        devIdentity,
        targetOrg,
        {
          featureFlagId: flagId,
          percentage: 50,
          salt: 'salt_abc',
        },
        'DEVELOPMENT',
      );

      expect(rollout.percentage).toBe(50);
    });

    it('should require policy approval for developer rollout in production', async () => {
      const targetOrg = ownerIdentity.organizationId!;
      // Direct production rollout without override -> FAILS with policy required
      await expect(
        rolloutService.executeRollout(
          devIdentity,
          targetOrg,
          {
            featureFlagId: flagId,
            percentage: 100,
            salt: 'salt_abc',
          },
          'PRODUCTION',
          false,
        ),
      ).rejects.toThrow(/requires explicit policy approval/);

      // With policy approval -> ALLOWED
      const approvedRollout = await rolloutService.executeRollout(
        devIdentity,
        targetOrg,
        {
          featureFlagId: flagId,
          percentage: 100,
          salt: 'salt_abc',
        },
        'PRODUCTION',
        true,
      );

      expect(approvedRollout.percentage).toBe(100);
    });
  });

  describe('ProjectManagementService Authorization (Restricted Actions)', () => {
    it('should permit ONLY Owner to delete project and reject Admin, Dev, Viewer at service layer', async () => {
      const targetOrg = ownerIdentity.organizationId!;
      // Admin -> Rejected
      await expect(
        projectService.deleteProject(adminIdentity, targetOrg, projectId),
      ).rejects.toThrow(/Only Owner role is authorized/);

      // Dev -> Rejected
      await expect(projectService.deleteProject(devIdentity, targetOrg, projectId)).rejects.toThrow(
        /Only Owner role is authorized/,
      );

      // Viewer -> Rejected
      await expect(
        projectService.deleteProject(viewerIdentity, targetOrg, projectId),
      ).rejects.toThrow(/Role 'VIEWER' is not authorized/);

      // Owner -> Allowed
      await expect(projectService.deleteProject(ownerIdentity, targetOrg, projectId)).resolves.toBe(
        true,
      );
    });
  });
});
