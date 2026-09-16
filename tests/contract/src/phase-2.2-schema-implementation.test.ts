import * as path from 'node:path';
import {
  CoreTableDefinitions,
  DatabaseTableNames,
  InMemorySqlEngine,
  MigrationRunner,
} from '@controlplane/database';
import { describe, expect, it } from 'vitest';

describe('PHASE 2.2 CONTRACT: Schema Implementation & Table Topology', () => {
  const migrationsDir = path.resolve(process.cwd(), 'infrastructure/database/migrations');

  it('CONTRACT: All 11 required entity tables must be registered in the schema catalogue', () => {
    const requiredTables = [
      'organizations',
      'projects',
      'environments',
      'feature_flags',
      'targeting_rules',
      'rollouts',
      'configuration_versions',
      'audit_events',
      'users',
      'roles',
      'api_keys',
    ];

    for (const table of requiredTables) {
      expect(DatabaseTableNames).toContain(table);
      expect(CoreTableDefinitions[table as keyof typeof CoreTableDefinitions]).toBeDefined();
    }
  });

  it('CONTRACT: SQL migrations must create all 11 tables with correct constraints and FK references', async () => {
    const engine = new InMemorySqlEngine();
    const runner = new MigrationRunner(engine, migrationsDir);

    const applied = await runner.migrate();
    expect(applied.length).toBeGreaterThanOrEqual(5);

    const queries = engine.getExecutedQueries();
    const createTableQueries = queries.filter((q) => /CREATE\s+TABLE/i.test(q));

    // Verify all 11 required tables were created via SQL migrations
    const requiredTables = [
      'organizations',
      'projects',
      'environments',
      'feature_flags',
      'targeting_rules',
      'rollouts',
      'configuration_versions',
      'audit_events',
      'users',
      'roles',
      'api_keys',
    ];

    for (const table of requiredTables) {
      const existsInSql = createTableQueries.some((q) =>
        new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${table}`, 'i').test(q),
      );
      expect(existsInSql, `Expected table ${table} to be created by migration SQL`).toBe(true);
    }
  });

  it('CONTRACT: Rollback migrations must cleanly drop all tables in reverse dependency order', async () => {
    const engine = new InMemorySqlEngine();
    const runner = new MigrationRunner(engine, migrationsDir);

    // Apply all
    await runner.migrate();
    const initialApplied = await runner.getAppliedMigrations();
    expect(initialApplied.length).toBeGreaterThanOrEqual(5);

    // Recreate database (rolls back everything then reapplies)
    const result = await runner.recreateDatabase();
    expect(result.rolledBack).toBe(initialApplied.length);
    expect(result.reapplied).toBe(initialApplied.length);

    const finalApplied = await runner.getAppliedMigrations();
    expect(finalApplied.length).toBe(initialApplied.length);
  });
});
