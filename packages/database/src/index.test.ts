import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getDatabaseConfig, InMemorySqlEngine, MigrationRunner } from './index.js';

describe('Database & Migration System (Phase 2.1)', () => {
  const migrationsDir = path.resolve(process.cwd(), 'infrastructure/database/migrations');

  it('should provide separate development and test database configuration profiles', () => {
    const devConfig = getDatabaseConfig('development');
    expect(devConfig.environment).toBe('development');
    expect(devConfig.database).toBe('controlplane_dev');

    const testConfig = getDatabaseConfig('test');
    expect(testConfig.environment).toBe('test');
    expect(testConfig.database).toBe('controlplane_test');

    const prodConfig = getDatabaseConfig('production');
    expect(prodConfig.environment).toBe('production');
    expect(prodConfig.database).toBe('controlplane');
    expect(prodConfig.ssl).toBe(true);
  });

  it('should load all migration files with valid checksums and up/down scripts', () => {
    const engine = new InMemorySqlEngine();
    const runner = new MigrationRunner(engine, migrationsDir);
    const migrations = runner.loadMigrations();

    expect(migrations.length).toBeGreaterThanOrEqual(5);

    // Verify ordering
    for (let i = 0; i < migrations.length; i++) {
      expect(migrations[i]?.version).toBe(i + 1);
      expect(migrations[i]?.upSql).toBeTruthy();
      expect(migrations[i]?.downSql).toBeTruthy();
      expect(migrations[i]?.checksum).toBeTypeOf('string');
      expect(migrations[i]?.checksum.length).toBe(64);
    }
  });

  it('should apply migrations cleanly and track schema_migrations state', async () => {
    const engine = new InMemorySqlEngine();
    const runner = new MigrationRunner(engine, migrationsDir);

    const applied = await runner.migrate();
    expect(applied.length).toBeGreaterThanOrEqual(5);

    const recorded = await runner.getAppliedMigrations();
    expect(recorded.length).toBe(applied.length);
    expect(recorded[0]?.version).toBe(1);
    expect(recorded[0]?.name).toBe('create_schema_migrations');

    // Idempotent migration - reapplying should apply 0 new migrations
    const secondPass = await runner.migrate();
    expect(secondPass.length).toBe(0);
  });

  it('should support rollback and full database recreation from migrations', async () => {
    const engine = new InMemorySqlEngine();
    const runner = new MigrationRunner(engine, migrationsDir);

    // Apply all
    await runner.migrate();
    const initialApplied = await runner.getAppliedMigrations();
    expect(initialApplied.length).toBeGreaterThanOrEqual(5);

    // Rollback one
    const rolledBack = await runner.rollback();
    expect(rolledBack?.version).toBe(5);

    const afterRollback = await runner.getAppliedMigrations();
    expect(afterRollback.length).toBe(initialApplied.length - 1);

    // Full Recreate
    const recreationResult = await runner.recreateDatabase();
    expect(recreationResult.rolledBack).toBe(afterRollback.length);
    expect(recreationResult.reapplied).toBeGreaterThanOrEqual(5);

    const finalApplied = await runner.getAppliedMigrations();
    expect(finalApplied.length).toBe(initialApplied.length);
  });
});
