import * as path from 'node:path';
import { getDatabaseConfig, InMemorySqlEngine, MigrationRunner } from '@controlplane/database';
import { describe, expect, it } from 'vitest';

describe('PHASE 2.1 CONTRACT: PostgreSQL Setup & Migration Lifecycle', () => {
  const migrationsDir = path.resolve(process.cwd(), 'infrastructure/database/migrations');

  it('CONTRACT: Must configure development (controlplane_dev) and test (controlplane_test) databases', () => {
    const devDb = getDatabaseConfig('development');
    const testDb = getDatabaseConfig('test');

    expect(devDb.database).toBe('controlplane_dev');
    expect(testDb.database).toBe('controlplane_test');
    expect(devDb.environment).toBe('development');
    expect(testDb.environment).toBe('test');
  });

  it('CONTRACT: Migration checksums must be deterministic SHA-256', () => {
    const engine = new InMemorySqlEngine();
    const runner = new MigrationRunner(engine, migrationsDir);
    const migrations = runner.loadMigrations();

    expect(migrations.length).toBeGreaterThanOrEqual(5);

    for (const m of migrations) {
      const recomputed = runner.calculateChecksum(m.upSql);
      expect(m.checksum).toBe(recomputed);
      expect(m.checksum).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('CONTRACT: Database can be recreated entirely from migrations', async () => {
    const engine = new InMemorySqlEngine();
    const runner = new MigrationRunner(engine, migrationsDir);

    // Initial migration
    const firstRun = await runner.migrate();
    expect(firstRun.length).toBeGreaterThanOrEqual(5);

    // Verify migrations table state
    const appliedFirst = await runner.getAppliedMigrations();
    expect(appliedFirst.length).toBe(firstRun.length);

    // Complete Database Recreation
    const recreateStats = await runner.recreateDatabase();
    expect(recreateStats.rolledBack).toBe(firstRun.length);
    expect(recreateStats.reapplied).toBe(firstRun.length);

    // Verify clean recreated state
    const appliedAfter = await runner.getAppliedMigrations();
    expect(appliedAfter.length).toBe(firstRun.length);
    expect(appliedAfter.map((m) => m.version)).toEqual([1, 2, 3, 4, 5]);
  });
});
