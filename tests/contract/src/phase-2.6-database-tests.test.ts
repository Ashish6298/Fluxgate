import * as path from 'node:path';
import {
  createDatabaseStorage,
  createRepositoryContainer,
  InMemorySqlEngine,
  MigrationRunner,
  type RepositoryContainer,
  TransactionManager,
} from '@controlplane/database';
import { describe, expect, it } from 'vitest';

describe('PHASE 2.6 CONTRACT: Comprehensive Database Test Suite', () => {
  const migrationsDir = path.resolve(process.cwd(), 'infrastructure/database/migrations');

  it('CONTRACT 1 (Migrations): Full migration, rollback, and re-application must execute deterministically', async () => {
    const engine = new InMemorySqlEngine();
    const runner = new MigrationRunner(engine, migrationsDir);

    // 1. Initial Migrate
    const applied = await runner.migrate();
    expect(applied.length).toBeGreaterThanOrEqual(6);

    // 2. Full Database Recreation (Rollback all + Re-apply all)
    const result = await runner.recreateDatabase();
    expect(result.rolledBack).toBe(applied.length);
    expect(result.reapplied).toBe(applied.length);

    // 3. Verify integrity of recorded migrations
    const recorded = await runner.getAppliedMigrations();
    expect(recorded).toHaveLength(applied.length);
    expect(recorded.map((m) => m.version)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('CONTRACT 2 (Constraints): Unique constraints and check rules must reject invalid inserts', async () => {
    const storage = createDatabaseStorage();
    const repos: RepositoryContainer = createRepositoryContainer(storage);

    // Create Tenant
    const org = await repos.organizations.create({ name: 'Alpha Org' });

    // Create Project
    await repos.projects.create({
      organizationId: org.id,
      name: 'Alpha Project',
      key: 'alpha-proj',
    });

    // Attempt Duplicate Project Key in same Org -> MUST FAIL
    await expect(
      repos.projects.create({
        organizationId: org.id,
        name: 'Duplicate Key Project',
        key: 'alpha-proj',
      }),
    ).rejects.toThrow(/Unique constraint violated/);

    // Attempt Duplicate User Email -> MUST FAIL
    await repos.users.create({
      email: 'unique@example.com',
      name: 'First User',
    });
    await expect(
      repos.users.create({
        email: 'unique@example.com',
        name: 'Second User',
      }),
    ).rejects.toThrow(/Unique constraint violated/);
  });

  it('CONTRACT 3 (Foreign Key Protection): Operations referencing non-existent parents must fail', async () => {
    const storage = createDatabaseStorage();
    const repos: RepositoryContainer = createRepositoryContainer(storage);

    const nonExistentOrgId = '00000000-0000-0000-0000-000000000000';

    // Insert Project with non-existent organizationId -> MUST FAIL
    await expect(
      repos.projects.create({
        organizationId: nonExistentOrgId,
        name: 'Orphan Project',
        key: 'orphan-proj',
      }),
    ).rejects.toThrow(/Foreign key constraint failed/);

    // Insert FeatureFlag with non-existent environmentId -> MUST FAIL
    const nonExistentEnvId = '11111111-1111-1111-1111-111111111111';
    await expect(
      repos.featureFlags.create({
        environmentId: nonExistentEnvId,
        key: 'orphan_flag',
        name: 'Orphan Flag',
        type: 'BOOLEAN',
        defaultValue: false,
      }),
    ).rejects.toThrow(/Foreign key constraint failed/);
  });

  it('CONTRACT 4 (Cascading Deletions): Deleting parent entity must cascade down child hierarchy', async () => {
    const storage = createDatabaseStorage();
    const repos: RepositoryContainer = createRepositoryContainer(storage);

    // Build hierarchy: Org -> Project -> Environment -> Flag -> Rule + Rollout
    const org = await repos.organizations.create({ name: 'Delete Cascade Org' });
    const project = await repos.projects.create({
      organizationId: org.id,
      name: 'Cascade Project',
      key: 'cascade-proj',
    });
    const env = await repos.environments.create({
      projectId: project.id,
      name: 'Cascade Env',
      key: 'cascade-env',
    });
    const flag = await repos.featureFlags.create({
      environmentId: env.id,
      key: 'cascade_flag',
      name: 'Cascade Flag',
      type: 'BOOLEAN',
      defaultValue: false,
    });
    const rule = await repos.targetingRules.create({
      featureFlagId: flag.id,
      priority: 0,
      conditions: [{ attribute: 'beta', operator: 'EQUALS', value: true }],
      value: true,
    });
    const rollout = await repos.rollouts.create({
      featureFlagId: flag.id,
      percentage: 25,
    });

    // Delete Parent Org
    await repos.organizations.delete(org.id);

    // Assert entire downstream hierarchy is cleanly pruned
    expect(await repos.organizations.findById(org.id)).toBeNull();
    expect(await repos.projects.findById(project.id)).toBeNull();
    expect(await repos.environments.findById(env.id)).toBeNull();
    expect(await repos.featureFlags.findById(flag.id)).toBeNull();
    expect(await repos.targetingRules.findById(rule.id)).toBeNull();
    expect(await repos.rollouts.findById(rollout.id)).toBeNull();
  });

  it('CONTRACT 5 (Transactions & Concurrent Updates): Concurrent multi-entity mutations must isolate and commit deterministically', async () => {
    const manager = new TransactionManager();

    const mockFlag = {
      id: 'f9999999-9999-9999-9999-999999999999',
      environmentId: 'e9999999-9999-9999-9999-999999999999',
      key: 'concurrent_flag',
      name: 'Concurrent Flag',
      type: 'NUMBER' as const,
      defaultValue: 10,
      enabled: true,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    };

    // Execute 5 concurrent atomic flag updates
    const updates = Array.from({ length: 5 }, (_, i) =>
      manager.executeAtomicFlagUpdate({
        organizationId: 'o9999999-9999-9999-9999-999999999999',
        projectKey: 'core-service',
        environmentKey: 'production',
        actorId: `usr_concurrent_${i}`,
        reason: `Concurrent mutation iteration ${i}`,
        flag: { ...mockFlag, defaultValue: 20 + i },
        targetingRules: [],
        allEnvironmentFlags: [mockFlag],
        allEnvironmentRules: [],
        allEnvironmentRollouts: [],
        currentVersionNumber: 10 + i,
      }),
    );

    const results = await Promise.all(updates);
    expect(results).toHaveLength(5);
    for (let i = 0; i < results.length; i++) {
      expect(results[i]?.updatedFlag.defaultValue).toBe(20 + i);
      expect(results[i]?.configurationVersion.version).toBe(11 + i);
      expect(results[i]?.auditEvent.actorId).toBe(`usr_concurrent_${i}`);
    }
  });
});
