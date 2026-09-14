import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Database environment configuration profile
 */
export interface DatabaseConfig {
  environment: 'development' | 'test' | 'production';
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
  maxConnections: number;
}

/**
 * Migration definition loaded from SQL migration files
 */
export interface MigrationDefinition {
  version: number;
  name: string;
  upSql: string;
  downSql: string;
  checksum: string;
  filename: string;
}

/**
 * Migration history record in schema_migrations table
 */
export interface AppliedMigration {
  version: number;
  name: string;
  checksum: string;
  appliedAt: Date;
}

/**
 * SQL Execution Interface to support real DB drivers and mock in-memory runners
 */
export interface SqlExecutor {
  execute(sql: string): Promise<void>;
  query<T = unknown>(sql: string): Promise<T[]>;
}

/**
 * In-memory Mock SQL Engine for self-contained validation and testing
 */
export class InMemorySqlEngine implements SqlExecutor {
  private tables = new Map<string, Array<Record<string, unknown>>>();
  private executedQueries: string[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.tables.clear();
    this.executedQueries = [];
    this.tables.set('schema_migrations', []);
  }

  public getExecutedQueries(): string[] {
    return [...this.executedQueries];
  }

  public getTableData(tableName: string): Array<Record<string, unknown>> {
    return this.tables.get(tableName.toLowerCase()) ?? [];
  }

  public async execute(sql: string): Promise<void> {
    this.executedQueries.push(sql);
    const trimmed = sql.trim();

    // Check for CREATE TABLE
    const createTableMatch = trimmed.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i,
    );
    if (createTableMatch && createTableMatch[1]) {
      const tableName = createTableMatch[1].toLowerCase();
      if (!this.tables.has(tableName)) {
        this.tables.set(tableName, []);
      }
      return;
    }

    // Check for DROP TABLE
    const dropTableMatch = trimmed.match(
      /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_,\s]+)(?:\s+CASCADE)?/i,
    );
    if (dropTableMatch && dropTableMatch[1]) {
      const tables = dropTableMatch[1].split(',').map((t) => t.trim().toLowerCase());
      for (const t of tables) {
        this.tables.delete(t);
      }
      return;
    }

    // Check for INSERT INTO schema_migrations
    const insertMigrationMatch = trimmed.match(
      /INSERT\s+INTO\s+schema_migrations\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i,
    );
    if (insertMigrationMatch && insertMigrationMatch[2]) {
      const rawValues = insertMigrationMatch[2]
        .split(',')
        .map((v) => v.trim().replace(/^'|'$/g, ''));
      const version = parseInt(rawValues[0] ?? '0', 10);
      const name = rawValues[1] ?? '';
      const checksum = rawValues[2] ?? '';

      const migrations = this.tables.get('schema_migrations') ?? [];
      migrations.push({
        version,
        name,
        checksum,
        applied_at: new Date().toISOString(),
      });
      this.tables.set('schema_migrations', migrations);
      return;
    }

    // Check for DELETE FROM schema_migrations WHERE version = ...
    const deleteMigrationMatch = trimmed.match(
      /DELETE\s+FROM\s+schema_migrations\s+WHERE\s+version\s*=\s*(\d+)/i,
    );
    if (deleteMigrationMatch && deleteMigrationMatch[1]) {
      const version = parseInt(deleteMigrationMatch[1], 10);
      const migrations = this.tables.get('schema_migrations') ?? [];
      const filtered = migrations.filter((m) => m.version !== version);
      this.tables.set('schema_migrations', filtered);
      return;
    }
  }

  public async query<T = unknown>(sql: string): Promise<T[]> {
    this.executedQueries.push(sql);
    const trimmed = sql.trim();

    // Query schema_migrations
    if (/SELECT.*FROM\s+schema_migrations/i.test(trimmed)) {
      const records = this.tables.get('schema_migrations') ?? [];
      const sorted = [...records].sort(
        (a, b) => (Number(a.version) || 0) - (Number(b.version) || 0),
      );
      return sorted as unknown as T[];
    }

    // Generic count or check
    return [] as T[];
  }
}

/**
 * Migration Manager & Runner
 */
export class MigrationRunner {
  private executor: SqlExecutor;
  private migrationsDir: string;

  constructor(executor: SqlExecutor, migrationsDir?: string) {
    this.executor = executor;
    this.migrationsDir =
      migrationsDir ?? path.resolve(process.cwd(), 'infrastructure/database/migrations');
  }

  /**
   * Calculate SHA-256 checksum for migration SQL script
   */
  public calculateChecksum(sqlContent: string): string {
    return crypto.createHash('sha256').update(sqlContent.trim()).digest('hex');
  }

  /**
   * Load and parse all SQL migrations from the filesystem directory
   */
  public loadMigrations(): MigrationDefinition[] {
    if (!fs.existsSync(this.migrationsDir)) {
      throw new Error(`Migrations directory does not exist: ${this.migrationsDir}`);
    }

    const files = fs.readdirSync(this.migrationsDir);
    const upFiles = files.filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'));

    const migrations: MigrationDefinition[] = [];

    for (const file of upFiles) {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match || !match[1] || !match[2]) {
        continue;
      }

      const version = parseInt(match[1], 10);
      const name = match[2];
      const upPath = path.join(this.migrationsDir, file);
      const downPath = path.join(this.migrationsDir, `${match[1]}_${match[2]}.down.sql`);

      const upSql = fs.readFileSync(upPath, 'utf8');
      const downSql = fs.existsSync(downPath) ? fs.readFileSync(downPath, 'utf8') : '';
      const checksum = this.calculateChecksum(upSql);

      migrations.push({
        version,
        name,
        upSql,
        downSql,
        checksum,
        filename: file,
      });
    }

    return migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Ensures the schema_migrations tracking table exists
   */
  public async ensureMigrationsTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await this.executor.execute(createTableSql);
  }

  /**
   * Retrieve all applied migrations
   */
  public async getAppliedMigrations(): Promise<AppliedMigration[]> {
    await this.ensureMigrationsTable();
    const rows = await this.executor.query<{
      version: number;
      name: string;
      checksum: string;
      applied_at: string;
    }>('SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC;');

    return rows.map((r) => ({
      version: Number(r.version),
      name: r.name,
      checksum: r.checksum,
      appliedAt: new Date(r.applied_at),
    }));
  }

  /**
   * Apply all pending migrations in order
   */
  public async migrate(): Promise<MigrationDefinition[]> {
    await this.ensureMigrationsTable();
    const available = this.loadMigrations();
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map((m) => [m.version, m]));

    const appliedList: MigrationDefinition[] = [];

    for (const migration of available) {
      const existing = appliedMap.get(migration.version);
      if (existing) {
        if (existing.checksum !== migration.checksum) {
          throw new Error(
            `Migration checksum mismatch for version ${migration.version} (${migration.name}). Existing: ${existing.checksum}, New: ${migration.checksum}`,
          );
        }
        continue;
      }

      // Execute migration up SQL
      await this.executor.execute(migration.upSql);

      // Record migration
      await this.executor.execute(
        `INSERT INTO schema_migrations (version, name, checksum) VALUES (${migration.version}, '${migration.name}', '${migration.checksum}');`,
      );

      appliedList.push(migration);
    }

    return appliedList;
  }

  /**
   * Rollback the latest applied migration
   */
  public async rollback(): Promise<AppliedMigration | null> {
    await this.ensureMigrationsTable();
    const applied = await this.getAppliedMigrations();
    if (applied.length === 0) {
      return null;
    }

    const latest = applied[applied.length - 1];
    if (!latest) {
      return null;
    }
    const available = this.loadMigrations();
    const migration = available.find((m) => m.version === latest.version);

    if (!migration || !migration.downSql) {
      throw new Error(`Cannot rollback version ${latest.version}: down migration SQL not found`);
    }

    // Execute rollback down SQL
    await this.executor.execute(migration.downSql);

    // Remove from schema_migrations
    await this.executor.execute(`DELETE FROM schema_migrations WHERE version = ${latest.version};`);

    return latest;
  }

  /**
   * Recreate database entirely from migrations
   */
  public async recreateDatabase(): Promise<{
    rolledBack: number;
    reapplied: number;
  }> {
    await this.ensureMigrationsTable();
    const applied = await this.getAppliedMigrations();
    let rolledBackCount = 0;

    // Rollback in reverse order
    for (let i = applied.length - 1; i >= 0; i--) {
      await this.rollback();
      rolledBackCount++;
    }

    // Apply all migrations
    const reapplied = await this.migrate();

    return {
      rolledBack: rolledBackCount,
      reapplied: reapplied.length,
    };
  }
}

/**
 * Standard PostgreSQL configuration profiles for development & testing
 */
export function getDatabaseConfig(
  env: 'development' | 'test' | 'production' = 'development',
): DatabaseConfig {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = parseInt(process.env.DB_PORT ?? '5432', 10);
  const user = process.env.DB_USER ?? 'postgres';
  const password = process.env.DB_PASSWORD ?? 'postgres';

  if (env === 'test') {
    return {
      environment: 'test',
      host,
      port,
      database: process.env.DB_TEST_NAME ?? 'controlplane_test',
      user,
      password,
      ssl: false,
      maxConnections: 10,
    };
  }

  if (env === 'production') {
    return {
      environment: 'production',
      host,
      port,
      database: process.env.DB_NAME ?? 'controlplane',
      user,
      password,
      ssl: true,
      maxConnections: 50,
    };
  }

  return {
    environment: 'development',
    host,
    port,
    database: process.env.DB_DEV_NAME ?? 'controlplane_dev',
    user,
    password,
    ssl: false,
    maxConnections: 20,
  };
}

export * from './schema/index.js';
