import { createRepositoryContainer, type RepositoryContainer } from '@controlplane/database';
import { describe, expect, it } from 'vitest';

describe('PHASE 2.5 CONTRACT: Repository Layer & Business/Database Decoupling', () => {
  const repos: RepositoryContainer = createRepositoryContainer();

  it('CONTRACT: Architecture must separate Business Logic from Database Logic via Repository Interfaces', () => {
    // Assert all 11 required domain entity repositories are accessible via the container interface
    expect(repos.organizations).toBeDefined();
    expect(repos.projects).toBeDefined();
    expect(repos.environments).toBeDefined();
    expect(repos.featureFlags).toBeDefined();
    expect(repos.targetingRules).toBeDefined();
    expect(repos.rollouts).toBeDefined();
    expect(repos.configurationVersions).toBeDefined();
    expect(repos.auditEvents).toBeDefined();
    expect(repos.users).toBeDefined();
    expect(repos.roles).toBeDefined();
    expect(repos.apiKeys).toBeDefined();
  });

  it('CONTRACT: Repository container must support end-to-end multi-tenant lifecycle operations', async () => {
    // 1. Create Organization
    const org = await repos.organizations.create({
      name: 'Enterprise Tenant',
    });
    expect(org.id).toBeDefined();

    // 2. Create Project
    const project = await repos.projects.create({
      organizationId: org.id,
      name: 'Cloud Gateway',
      key: 'cloud-gateway',
    });
    expect(project.organizationId).toBe(org.id);

    // 3. Create Environment
    const env = await repos.environments.create({
      projectId: project.id,
      name: 'Production',
      key: 'production',
      type: 'PRODUCTION',
    });
    expect(env.projectId).toBe(project.id);

    // 4. Create Feature Flag
    const flag = await repos.featureFlags.create({
      environmentId: env.id,
      key: 'rate_limiting_v2',
      name: 'Rate Limiting v2',
      type: 'JSON',
      defaultValue: { rpm: 1000, burst: 1200 },
      enabled: true,
    });
    expect(flag.key).toBe('rate_limiting_v2');

    // 5. Create Configuration Version Snapshot
    const version = await repos.configurationVersions.create({
      environmentId: env.id,
      version: 1,
      snapshot: {
        schemaVersion: 1,
        projectKey: 'cloud-gateway',
        environmentKey: 'production',
        configurationVersion: 1,
        checksum: 'sha256_mock_abc',
        flags: [],
      },
      checksum: 'sha256_mock_abc',
      createdBy: 'usr_sys_admin',
      reason: 'Initial production baseline',
    });
    expect(version.version).toBe(1);

    // 6. Verify Latest Version Lookup
    const latest = await repos.configurationVersions.getLatestVersion(env.id);
    expect(latest?.version).toBe(1);
    expect(latest?.checksum).toBe('sha256_mock_abc');
  });
});
