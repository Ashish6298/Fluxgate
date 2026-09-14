/**
 * Supported database table names representing the 11 Phase 2.2 core entities
 */
export const DatabaseTableNames = [
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
] as const;

export type DatabaseTableName = (typeof DatabaseTableNames)[number];

/**
 * Column definition schema
 */
export interface ColumnDefinition {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
  references?: {
    table: DatabaseTableName;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
  check?: string;
}

/**
 * Table definition metadata schema
 */
export interface TableDefinition {
  tableName: DatabaseTableName;
  description: string;
  columns: ColumnDefinition[];
  uniqueConstraints?: Array<{
    name: string;
    columns: string[];
  }>;
}

/**
 * Organizations Table Schema
 */
export const OrganizationsTable: TableDefinition = {
  tableName: 'organizations',
  description: 'Represents a multi-tenant organization boundary',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    { name: 'name', type: 'VARCHAR(255)', isNullable: false },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
  ],
};

/**
 * Projects Table Schema
 */
export const ProjectsTable: TableDefinition = {
  tableName: 'projects',
  description: 'Represents a project grouped under an organization',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    {
      name: 'organization_id',
      type: 'UUID',
      isNullable: false,
      references: { table: 'organizations', column: 'id', onDelete: 'CASCADE' },
    },
    { name: 'name', type: 'VARCHAR(255)', isNullable: false },
    { name: 'key', type: 'VARCHAR(63)', isNullable: false },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
  ],
  uniqueConstraints: [
    {
      name: 'uq_org_project_key',
      columns: ['organization_id', 'key'],
    },
  ],
};

/**
 * Environments Table Schema
 */
export const EnvironmentsTable: TableDefinition = {
  tableName: 'environments',
  description: 'Represents an isolated deployment environment within a project',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    {
      name: 'project_id',
      type: 'UUID',
      isNullable: false,
      references: { table: 'projects', column: 'id', onDelete: 'CASCADE' },
    },
    { name: 'name', type: 'VARCHAR(255)', isNullable: false },
    { name: 'key', type: 'VARCHAR(63)', isNullable: false },
    { name: 'type', type: 'VARCHAR(50)', isNullable: false, defaultValue: "'CUSTOM'" },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
  ],
  uniqueConstraints: [
    {
      name: 'uq_proj_env_key',
      columns: ['project_id', 'key'],
    },
  ],
};

/**
 * Feature Flags Table Schema
 */
export const FeatureFlagsTable: TableDefinition = {
  tableName: 'feature_flags',
  description: 'Represents a remotely configurable feature flag bound to an environment',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    {
      name: 'environment_id',
      type: 'UUID',
      isNullable: false,
      references: { table: 'environments', column: 'id', onDelete: 'CASCADE' },
    },
    { name: 'key', type: 'VARCHAR(64)', isNullable: false },
    { name: 'name', type: 'VARCHAR(255)', isNullable: false },
    { name: 'description', type: 'VARCHAR(1024)', isNullable: true },
    {
      name: 'type',
      type: 'VARCHAR(20)',
      isNullable: false,
      check: "type IN ('BOOLEAN', 'STRING', 'NUMBER', 'JSON')",
    },
    { name: 'default_value', type: 'JSONB', isNullable: false },
    { name: 'enabled', type: 'BOOLEAN', isNullable: false, defaultValue: 'TRUE' },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
  ],
  uniqueConstraints: [
    {
      name: 'uq_env_flag_key',
      columns: ['environment_id', 'key'],
    },
  ],
};

/**
 * Targeting Rules Table Schema
 */
export const TargetingRulesTable: TableDefinition = {
  tableName: 'targeting_rules',
  description: 'Represents ordered rule-based targeting conditions for a feature flag',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    {
      name: 'feature_flag_id',
      type: 'UUID',
      isNullable: false,
      references: { table: 'feature_flags', column: 'id', onDelete: 'CASCADE' },
    },
    {
      name: 'priority',
      type: 'INTEGER',
      isNullable: false,
      defaultValue: '0',
      check: 'priority >= 0',
    },
    { name: 'conditions', type: 'JSONB', isNullable: false },
    { name: 'value', type: 'JSONB', isNullable: false },
    { name: 'enabled', type: 'BOOLEAN', isNullable: false, defaultValue: 'TRUE' },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
  ],
};

/**
 * Rollouts Table Schema
 */
export const RolloutsTable: TableDefinition = {
  tableName: 'rollouts',
  description: 'Represents deterministic percentage rollout configuration for a feature flag',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    {
      name: 'feature_flag_id',
      type: 'UUID',
      isNullable: false,
      references: { table: 'feature_flags', column: 'id', onDelete: 'CASCADE' },
    },
    {
      name: 'percentage',
      type: 'NUMERIC(5, 2)',
      isNullable: false,
      check: 'percentage >= 0 AND percentage <= 100',
    },
    { name: 'salt', type: 'VARCHAR(128)', isNullable: false, defaultValue: "'v1'" },
    { name: 'enabled', type: 'BOOLEAN', isNullable: false, defaultValue: 'TRUE' },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
  ],
  uniqueConstraints: [
    {
      name: 'uq_flag_rollout',
      columns: ['feature_flag_id'],
    },
  ],
};

/**
 * Configuration Versions Table Schema
 */
export const ConfigurationVersionsTable: TableDefinition = {
  tableName: 'configuration_versions',
  description: 'Represents immutable configuration snapshots per environment',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    {
      name: 'environment_id',
      type: 'UUID',
      isNullable: false,
      references: { table: 'environments', column: 'id', onDelete: 'CASCADE' },
    },
    { name: 'version', type: 'INTEGER', isNullable: false, check: 'version > 0' },
    { name: 'snapshot', type: 'JSONB', isNullable: false },
    { name: 'checksum', type: 'VARCHAR(64)', isNullable: false },
    { name: 'created_by', type: 'VARCHAR(255)', isNullable: false },
    { name: 'reason', type: 'VARCHAR(1024)', isNullable: true },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
  ],
  uniqueConstraints: [
    {
      name: 'uq_env_version',
      columns: ['environment_id', 'version'],
    },
  ],
};

/**
 * Audit Events Table Schema
 */
export const AuditEventsTable: TableDefinition = {
  tableName: 'audit_events',
  description: 'Represents append-only immutable audit trail of actions',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    {
      name: 'organization_id',
      type: 'UUID',
      isNullable: false,
      references: { table: 'organizations', column: 'id', onDelete: 'CASCADE' },
    },
    { name: 'actor_id', type: 'VARCHAR(255)', isNullable: false },
    { name: 'action', type: 'VARCHAR(64)', isNullable: false },
    { name: 'resource_type', type: 'VARCHAR(64)', isNullable: false },
    { name: 'resource_id', type: 'UUID', isNullable: false },
    { name: 'before', type: 'JSONB', isNullable: true },
    { name: 'after', type: 'JSONB', isNullable: true },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
  ],
};

/**
 * Users Table Schema
 */
export const UsersTable: TableDefinition = {
  tableName: 'users',
  description: 'Represents platform users and system accounts',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    { name: 'email', type: 'VARCHAR(255)', isNullable: false, isUnique: true },
    { name: 'name', type: 'VARCHAR(255)', isNullable: false },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
  ],
};

/**
 * Roles Table Schema
 */
export const RolesTable: TableDefinition = {
  tableName: 'roles',
  description: 'Represents organizational roles and granular permission sets',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    {
      name: 'organization_id',
      type: 'UUID',
      isNullable: false,
      references: { table: 'organizations', column: 'id', onDelete: 'CASCADE' },
    },
    { name: 'name', type: 'VARCHAR(64)', isNullable: false },
    { name: 'description', type: 'VARCHAR(255)', isNullable: true },
    { name: 'permissions', type: 'JSONB', isNullable: false, defaultValue: "'[]'::jsonb" },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
  ],
  uniqueConstraints: [
    {
      name: 'uq_org_role_name',
      columns: ['organization_id', 'name'],
    },
  ],
};

/**
 * API Keys Table Schema
 */
export const ApiKeysTable: TableDefinition = {
  tableName: 'api_keys',
  description: 'Represents scoped hashed authentication tokens for SDKs and clients',
  columns: [
    {
      name: 'id',
      type: 'UUID',
      isNullable: false,
      isPrimaryKey: true,
      defaultValue: 'uuid_generate_v4()',
    },
    {
      name: 'organization_id',
      type: 'UUID',
      isNullable: false,
      references: { table: 'organizations', column: 'id', onDelete: 'CASCADE' },
    },
    {
      name: 'environment_id',
      type: 'UUID',
      isNullable: true,
      references: { table: 'environments', column: 'id', onDelete: 'CASCADE' },
    },
    { name: 'name', type: 'VARCHAR(255)', isNullable: false },
    { name: 'key_hash', type: 'VARCHAR(128)', isNullable: false, isUnique: true },
    { name: 'key_prefix', type: 'VARCHAR(16)', isNullable: false },
    {
      name: 'type',
      type: 'VARCHAR(32)',
      isNullable: false,
      check: "type IN ('SERVER', 'CLIENT', 'ADMIN')",
    },
    { name: 'created_at', type: 'TIMESTAMPTZ', isNullable: false, defaultValue: 'NOW()' },
    { name: 'expires_at', type: 'TIMESTAMPTZ', isNullable: true },
  ],
};

/**
 * All Core Table Definitions Registry
 */
export const CoreTableDefinitions: Record<DatabaseTableName, TableDefinition> = {
  organizations: OrganizationsTable,
  projects: ProjectsTable,
  environments: EnvironmentsTable,
  feature_flags: FeatureFlagsTable,
  targeting_rules: TargetingRulesTable,
  rollouts: RolloutsTable,
  configuration_versions: ConfigurationVersionsTable,
  audit_events: AuditEventsTable,
  users: UsersTable,
  roles: RolesTable,
  api_keys: ApiKeysTable,
};
