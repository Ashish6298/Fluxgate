import { describe, expect, it } from 'vitest';
import type { AuthIdentity } from '@controlplane/contracts';
import {
  ProjectManagementService,
  EnvironmentManagementService,
  FeatureFlagManagementService,
  RolloutManagementService,
  AuthorizationError,
} from '@controlplane/control-api';
import { createRepositoryContainer } from '@controlplane/database';

describe('Phase 4.4 — Tenant Isolation Contract & Critical Invariant', () => {
  const repos = createRepositoryContainer();
  const projectService = new ProjectManagementService(repos);
  const envService = new EnvironmentManagementService(repos);
  const flagService = new FeatureFlagManagementService(repos);
  const rolloutService = new RolloutManagementService(repos);

  const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const tenantAOwner: AuthIdentity = {
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'owner@tenanta.com',
    name: 'Tenant A Owner',
    organizationId: tenantA,
    role: 'OWNER',
  };

  const tenantBAdmin: AuthIdentity = {
    userId: '22222222-2222-2222-2222-222222222222',
    email: 'admin@tenantb.com',
    name: 'Tenant B Admin',
    organizationId: tenantB,
    role: 'ADMIN',
  };

  it('Critical Invariant: Tenant A CANNOT access Tenant B projects (Cross-organization project access MUST fail)', async () => {
    // List projects across organization boundaries
    await expect(projectService.listProjects(tenantAOwner, tenantB)).rejects.toThrow(
      AuthorizationError,
    );
    await expect(projectService.listProjects(tenantAOwner, tenantB)).rejects.toThrow(
      /Tenant isolation mismatch/,
    );

    // Get project across boundaries
    await expect(projectService.getProject(tenantAOwner, tenantB, 'some-proj-id')).rejects.toThrow(
      /Tenant isolation mismatch/,
    );

    // Create project across boundaries
    await expect(
      projectService.createProject(tenantAOwner, tenantB, { name: 'Hack', key: 'hack' }),
    ).rejects.toThrow(/Tenant isolation mismatch/);

    // Delete project across boundaries
    await expect(
      projectService.deleteProject(tenantAOwner, tenantB, 'some-proj-id'),
    ).rejects.toThrow(/Tenant isolation mismatch/);
  });

  it('Critical Invariant: Tenant A CANNOT access Tenant B environments (Cross-organization environment access MUST fail)', async () => {
    // List environments across boundaries
    await expect(
      envService.listEnvironments(tenantAOwner, tenantB, 'some-proj-id'),
    ).rejects.toThrow(/Tenant isolation mismatch/);

    // Get environment across boundaries
    await expect(envService.getEnvironment(tenantAOwner, tenantB, 'some-env-id')).rejects.toThrow(
      /Tenant isolation mismatch/,
    );

    // Create environment across boundaries
    await expect(
      envService.createEnvironment(tenantAOwner, tenantB, 'some-proj-id', {
        name: 'Injected Env',
        key: 'injected',
      }),
    ).rejects.toThrow(/Tenant isolation mismatch/);
  });

  it('Critical Invariant: Tenant A CANNOT access Tenant B feature flags (Cross-organization flag access MUST fail)', async () => {
    // List flags across boundaries
    await expect(flagService.listFlags(tenantAOwner, tenantB, 'some-env-id')).rejects.toThrow(
      /Tenant isolation mismatch/,
    );

    // Get flag across boundaries
    await expect(flagService.getFlag(tenantAOwner, tenantB, 'some-flag-id')).rejects.toThrow(
      /Tenant isolation mismatch/,
    );

    // Create flag across boundaries
    await expect(
      flagService.createFlag(tenantAOwner, tenantB, {
        environmentId: 'some-env-id',
        key: 'bad_flag',
        name: 'Bad Flag',
        type: 'BOOLEAN',
        defaultValue: false,
      }),
    ).rejects.toThrow(/Tenant isolation mismatch/);

    // Modify flag across boundaries
    await expect(
      flagService.updateFlag(tenantAOwner, tenantB, 'some-flag-id', { name: 'Hacked Flag' }),
    ).rejects.toThrow(/Tenant isolation mismatch/);

    // Delete flag across boundaries
    await expect(flagService.deleteFlag(tenantAOwner, tenantB, 'some-flag-id')).rejects.toThrow(
      /Tenant isolation mismatch/,
    );
  });

  it('Critical Invariant: Tenant B CANNOT access Tenant A resources (Symmetric isolation MUST fail)', async () => {
    await expect(projectService.listProjects(tenantBAdmin, tenantA)).rejects.toThrow(
      /Tenant isolation mismatch/,
    );
    await expect(
      envService.listEnvironments(tenantBAdmin, tenantA, 'some-proj-id'),
    ).rejects.toThrow(/Tenant isolation mismatch/);
    await expect(flagService.listFlags(tenantBAdmin, tenantA, 'some-env-id')).rejects.toThrow(
      /Tenant isolation mismatch/,
    );
    await expect(
      rolloutService.executeRollout(
        tenantBAdmin,
        tenantA,
        { featureFlagId: 'flag-1', percentage: 50, salt: 's' },
        'DEVELOPMENT',
      ),
    ).rejects.toThrow(/Tenant isolation mismatch/);
  });
});
