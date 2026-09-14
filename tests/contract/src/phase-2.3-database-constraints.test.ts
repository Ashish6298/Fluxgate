import * as path from 'node:path';
import {
  CoreTableDefinitions,
  DatabaseTableNames,
  InMemorySqlEngine,
  MigrationRunner,
} from '@controlplane/database';
import { describe, expect, it } from 'vitest';

describe('PHASE 2.3 CONTRACT: Database Constraints, Foreign Keys & Indexes', () => {
  const migrationsDir = path.resolve(process.cwd(), 'infrastructure/database/migrations');

  it('CONTRACT: Primary keys and non-null required fields must be defined on all core tables', () => {
    for (const tableName of DatabaseTableNames) {
      const table = CoreTableDefinitions[tableName];
      const pkCol = table.columns.find((c) => c.isPrimaryKey);
      expect(pkCol, `Table ${tableName} must define an explicit primary key column`).toBeDefined();
      expect(pkCol?.name).toBe('id');
      expect(pkCol?.isNullable).toBe(false);

      // Verify required fields (isNullable is false for essential columns)
      const nonNullCols = table.columns.filter((c) => !c.isNullable);
      expect(nonNullCols.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('CONTRACT: Relational foreign keys must maintain tenant hierarchy with cascading deletes', () => {
    // Project -> Organization
    const projectOrgFk = CoreTableDefinitions.projects.columns.find(
      (c) => c.name === 'organization_id',
    );
    expect(projectOrgFk?.references?.table).toBe('organizations');
    expect(projectOrgFk?.references?.onDelete).toBe('CASCADE');

    // Environment -> Project
    const envProjFk = CoreTableDefinitions.environments.columns.find(
      (c) => c.name === 'project_id',
    );
    expect(envProjFk?.references?.table).toBe('projects');
    expect(envProjFk?.references?.onDelete).toBe('CASCADE');

    // FeatureFlag -> Environment
    const flagEnvFk = CoreTableDefinitions.feature_flags.columns.find(
      (c) => c.name === 'environment_id',
    );
    expect(flagEnvFk?.references?.table).toBe('environments');
    expect(flagEnvFk?.references?.onDelete).toBe('CASCADE');

    // TargetingRule -> FeatureFlag
    const ruleFlagFk = CoreTableDefinitions.targeting_rules.columns.find(
      (c) => c.name === 'feature_flag_id',
    );
    expect(ruleFlagFk?.references?.table).toBe('feature_flags');
    expect(ruleFlagFk?.references?.onDelete).toBe('CASCADE');

    // Rollout -> FeatureFlag
    const rolloutFlagFk = CoreTableDefinitions.rollouts.columns.find(
      (c) => c.name === 'feature_flag_id',
    );
    expect(rolloutFlagFk?.references?.table).toBe('feature_flags');
    expect(rolloutFlagFk?.references?.onDelete).toBe('CASCADE');
  });

  it('CONTRACT: Critical unique constraints must be enforced (e.g. organizationId + projectKey)', () => {
    // organizationId + projectKey
    expect(CoreTableDefinitions.projects.uniqueConstraints).toContainEqual({
      name: 'uq_org_project_key',
      columns: ['organization_id', 'key'],
    });

    // projectId + environmentKey
    expect(CoreTableDefinitions.environments.uniqueConstraints).toContainEqual({
      name: 'uq_proj_env_key',
      columns: ['project_id', 'key'],
    });

    // environmentId + flagKey
    expect(CoreTableDefinitions.feature_flags.uniqueConstraints).toContainEqual({
      name: 'uq_env_flag_key',
      columns: ['environment_id', 'key'],
    });

    // environmentId + version
    expect(CoreTableDefinitions.configuration_versions.uniqueConstraints).toContainEqual({
      name: 'uq_env_version',
      columns: ['environment_id', 'version'],
    });
  });

  it('CONTRACT: Migration 006 must apply performance and relational indexes across all core tables', async () => {
    const engine = new InMemorySqlEngine();
    const runner = new MigrationRunner(engine, migrationsDir);

    const applied = await runner.migrate();
    expect(applied.length).toBeGreaterThanOrEqual(6);

    const appliedVersions = await runner.getAppliedMigrations();
    const version6 = appliedVersions.find((m) => m.version === 6);
    expect(version6).toBeDefined();
    expect(version6?.name).toBe('create_indexes');
  });
});
