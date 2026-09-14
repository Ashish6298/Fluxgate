/**
 * Supported database table names representing the 11 Phase 2.2/2.3 core entities
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
 * Database index definition schema
 */
export interface IndexDefinition {
  name: string;
  tableName: DatabaseTableName;
  columns: string[];
  isUnique?: boolean;
  order?: 'ASC' | 'DESC';
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
  indexes?: IndexDefinition[];
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
  indexes: [
    {
      name: 'idx_organizations_name',
      tableName: 'organizations',
      columns: ['name'],
    },
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
  indexes: [
    {
      name: 'idx_projects_organization_id',
      tableName: 'projects',
      columns: ['organization_id'],
    },
    {
      name: 'idx_projects_key',
      tableName: 'projects',
      columns: ['key'],
    },
    {
      name: 'idx_projects_org_key',
      tableName: 'projects',
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
  indexes: [
    {
      name: 'idx_environments_project_id',
      tableName: 'environments',
      columns: ['project_id'],
    },
    {
      name: 'idx_environments_key',
      tableName: 'environments',
      columns: ['key'],
    },
    {
      name: 'idx_environments_proj_key',
      tableName: 'environments',
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
  indexes: [
    {
      name: 'idx_feature_flags_environment_id',
      tableName: 'feature_flags',
      columns: ['environment_id'],
    },
    {
      name: 'idx_feature_flags_key',
      tableName: 'feature_flags',
      columns: ['key'],
    },
    {
      name: 'idx_feature_flags_env_key',
      tableName: 'feature_flags',
      columns: ['environment_id', 'key'],
    },
    {
      name: 'idx_feature_flags_enabled',
      tableName: 'feature_flags',
      columns: ['enabled'],
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
  indexes: [
    {
      name: 'idx_targeting_rules_feature_flag_id',
      tableName: 'targeting_rules',
      columns: ['feature_flag_id'],
    },
    {
      name: 'idx_targeting_rules_priority',
      tableName: 'targeting_rules',
      columns: ['feature_flag_id', 'priority'],
    },
    {
      name: 'idx_targeting_rules_enabled',
      tableName: 'targeting_rules',
      columns: ['enabled'],
    },
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
  indexes: [
    {
      name: 'idx_rollouts_feature_flag_id',
      tableName: 'rollouts',
      columns: ['feature_flag_id'],
    },
    {
      name: 'idx_rollouts_enabled',
      tableName: 'rollouts',
      columns: ['enabled'],
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
  indexes: [
    {
      name: 'idx_config_versions_env_id',
      tableName: 'configuration_versions',
      columns: ['environment_id'],
    },
    {
      name: 'idx_config_versions_env_version',
      tableName: 'configuration_versions',
      columns: ['environment_id', 'version'],
    },
    {
      name: 'idx_config_versions_checksum',
      tableName: 'configuration_versions',
      columns: ['checksum'],
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
  indexes: [
    {
      name: 'idx_audit_events_org_id',
      tableName: 'audit_events',
      columns: ['organization_id'],
    },
    {
      name: 'idx_audit_events_resource',
      tableName: 'audit_events',
      columns: ['resource_type', 'resource_id'],
    },
    {
      name: 'idx_audit_events_actor',
      tableName: 'audit_events',
      columns: ['actor_id'],
    },
    {
      name: 'idx_audit_events_created_at',
      tableName: 'audit_events',
      columns: ['created_at'],
    },
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
  indexes: [
    {
      name: 'idx_users_email',
      tableName: 'users',
      columns: ['email'],
    },
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
  indexes: [
    {
      name: 'idx_roles_org_id',
      tableName: 'roles',
      columns: ['organization_id'],
    },
    {
      name: 'idx_roles_org_name',
      tableName: 'roles',
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
  indexes: [
    {
      name: 'idx_api_keys_org_id',
      tableName: 'api_keys',
      columns: ['organization_id'],
    },
    {
      name: 'idx_api_keys_env_id',
      tableName: 'api_keys',
      columns: ['environment_id'],
    },
    {
      name: 'idx_api_keys_key_hash',
      tableName: 'api_keys',
      columns: ['key_hash'],
    },
    {
      name: 'idx_api_keys_prefix',
      tableName: 'api_keys',
      columns: ['key_prefix'],
    },
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
