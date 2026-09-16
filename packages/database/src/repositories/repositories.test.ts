import { describe, expect, it } from 'vitest';
import { createRepositoryContainer } from './index.js';

describe('Repository Layer Architecture & PostgreSQL Implementations (Phase 2.5)', () => {
  const repos = createRepositoryContainer();

  it('should support complete Organization CRUD via Repository Interface', async () => {
    const org = await repos.organizations.create({ name: 'Acme Corp' });
    expect(org.id).toBeDefined();
    expect(org.name).toBe('Acme Corp');

    const found = await repos.organizations.findById(org.id);
    expect(found?.name).toBe('Acme Corp');

    const byName = await repos.organizations.findByName('Acme Corp');
    expect(byName?.id).toBe(org.id);

    const updated = await repos.organizations.update(org.id, { name: 'Acme Global' });
    expect(updated?.name).toBe('Acme Global');

    const list = await repos.organizations.listAll();
    expect(list.length).toBeGreaterThanOrEqual(1);

    const deleted = await repos.organizations.delete(org.id);
    expect(deleted).toBe(true);
    expect(await repos.organizations.findById(org.id)).toBeNull();
  });

  it('should support Project & Environment hierarchy queries via Repository Interfaces', async () => {
    const org = await repos.organizations.create({ name: 'TechCo' });
    const project = await repos.projects.create({
      organizationId: org.id,
      name: 'Mobile Core',
      key: 'mobile-core',
    });

    const env = await repos.environments.create({
      projectId: project.id,
      name: 'Production',
      key: 'production',
      type: 'PRODUCTION',
    });

    // Scoped queries
    const foundProj = await repos.projects.findByKey(org.id, 'mobile-core');
    expect(foundProj?.id).toBe(project.id);

    const foundEnv = await repos.environments.findByKey(project.id, 'production');
    expect(foundEnv?.id).toBe(env.id);
    expect(foundEnv?.type).toBe('PRODUCTION');

    const envs = await repos.environments.listByProject(project.id);
    expect(envs).toHaveLength(1);
    expect(envs[0]?.key).toBe('production');
  });

  it('should support FeatureFlag, TargetingRule, and Rollout repositories', async () => {
    const org = await repos.organizations.create({ name: 'DevOrg' });
    const project = await repos.projects.create({
      organizationId: org.id,
      name: 'API Service',
      key: 'api-service',
    });
    const env = await repos.environments.create({
      projectId: project.id,
      name: 'Staging',
      key: 'staging',
      type: 'STAGING',
    });

    const flag = await repos.featureFlags.create({
      environmentId: env.id,
      key: 'new_checkout',
      name: 'New Checkout Flow',
      type: 'BOOLEAN',
      defaultValue: false,
      enabled: true,
    });
    expect(flag.key).toBe('new_checkout');

    const rule = await repos.targetingRules.create({
      featureFlagId: flag.id,
      priority: 1,
      conditions: [{ attribute: 'country', operator: 'EQUALS', value: 'US' }],
      value: true,
    });
    expect(rule.featureFlagId).toBe(flag.id);

    const rollout = await repos.rollouts.create({
      featureFlagId: flag.id,
      percentage: 50,
      salt: 'salt_123',
    });
    expect(rollout.percentage).toBe(50);

    const flagRules = await repos.targetingRules.listByFeatureFlag(flag.id);
    expect(flagRules).toHaveLength(1);

    const flagRollout = await repos.rollouts.findByFeatureFlag(flag.id);
    expect(flagRollout?.percentage).toBe(50);
  });

  it('should support ConfigurationVersion, AuditEvent, User, Role, and ApiKey repositories', async () => {
    const org = await repos.organizations.create({ name: 'AuthOrg' });

    // User & Role
    const user = await repos.users.create({
      email: 'admin@authorg.com',
      name: 'Admin User',
    });
    expect(user.email).toBe('admin@authorg.com');

    const role = await repos.roles.create({
      organizationId: org.id,
      name: 'ReleaseManager',
      permissions: ['flags:read', 'flags:write'],
    });
    expect(role.name).toBe('ReleaseManager');

    // API Key
    const apiKey = await repos.apiKeys.create({
      organizationId: org.id,
      name: 'SDK Key',
      keyHash: 'hash_abc_123',
      keyPrefix: 'cp_live_',
      type: 'SERVER',
    });
    expect(apiKey.keyPrefix).toBe('cp_live_');
    const foundKey = await repos.apiKeys.findByKeyHash('hash_abc_123');
    expect(foundKey?.id).toBe(apiKey.id);

    // Audit Event
    const audit = await repos.auditEvents.create({
      organizationId: org.id,
      actorId: user.id,
      action: 'API_KEY_CREATED',
      resourceType: 'API_KEY',
      resourceId: apiKey.id,
      after: { keyName: apiKey.name },
    });
    expect(audit.action).toBe('API_KEY_CREATED');
    const orgAudits = await repos.auditEvents.listByOrganization(org.id);
    expect(orgAudits.length).toBeGreaterThanOrEqual(1);
  });
});
