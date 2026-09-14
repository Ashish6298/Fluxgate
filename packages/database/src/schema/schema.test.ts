import { describe, expect, it } from 'vitest';
import type { ColumnDefinition } from './definitions.js';
import {
  AuditEventsTable,
  ConfigurationVersionsTable,
  CoreTableDefinitions,
  DatabaseTableNames,
  EnvironmentsTable,
  FeatureFlagsTable,
  OrganizationsTable,
  ProjectsTable,
  RolesTable,
  RolloutsTable,
  TargetingRulesTable,
  UsersTable,
  ApiKeysTable,
} from './index.js';

describe('Database Schema Definitions (Phase 2.2)', () => {
  it('should define all 11 core tables specified in Phase 2.2', () => {
    expect(DatabaseTableNames).toHaveLength(11);
    expect(DatabaseTableNames).toEqual([
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
    ]);
  });

  it('should verify all tables are in CoreTableDefinitions registry', () => {
    for (const tableName of DatabaseTableNames) {
      expect(CoreTableDefinitions[tableName]).toBeDefined();
      expect(CoreTableDefinitions[tableName].tableName).toBe(tableName);
    }
  });

  it('should verify Organizations schema structure', () => {
    expect(OrganizationsTable.tableName).toBe('organizations');
    const cols = OrganizationsTable.columns.map((c: ColumnDefinition) => c.name);
    expect(cols).toContain('id');
    expect(cols).toContain('name');
    expect(cols).toContain('created_at');
    expect(cols).toContain('updated_at');
  });

  it('should verify Projects schema structure and foreign key to organizations', () => {
    expect(ProjectsTable.tableName).toBe('projects');
    const orgIdCol = ProjectsTable.columns.find(
      (c: ColumnDefinition) => c.name === 'organization_id',
    );
    expect(orgIdCol?.references?.table).toBe('organizations');
    expect(ProjectsTable.uniqueConstraints).toContainEqual({
      name: 'uq_org_project_key',
      columns: ['organization_id', 'key'],
    });
  });

  it('should verify Environments schema structure and foreign key to projects', () => {
    expect(EnvironmentsTable.tableName).toBe('environments');
    const projIdCol = EnvironmentsTable.columns.find(
      (c: ColumnDefinition) => c.name === 'project_id',
    );
    expect(projIdCol?.references?.table).toBe('projects');
    expect(EnvironmentsTable.uniqueConstraints).toContainEqual({
      name: 'uq_proj_env_key',
      columns: ['project_id', 'key'],
    });
  });

  it('should verify FeatureFlags, TargetingRules, and Rollouts schema relations', () => {
    expect(FeatureFlagsTable.tableName).toBe('feature_flags');
    const envIdCol = FeatureFlagsTable.columns.find(
      (c: ColumnDefinition) => c.name === 'environment_id',
    );
    expect(envIdCol?.references?.table).toBe('environments');

    expect(TargetingRulesTable.tableName).toBe('targeting_rules');
    const flagRuleCol = TargetingRulesTable.columns.find(
      (c: ColumnDefinition) => c.name === 'feature_flag_id',
    );
    expect(flagRuleCol?.references?.table).toBe('feature_flags');

    expect(RolloutsTable.tableName).toBe('rollouts');
    const flagRolloutCol = RolloutsTable.columns.find(
      (c: ColumnDefinition) => c.name === 'feature_flag_id',
    );
    expect(flagRolloutCol?.references?.table).toBe('feature_flags');
  });

  it('should verify ConfigurationVersions and AuditEvents schema structure', () => {
    expect(ConfigurationVersionsTable.tableName).toBe('configuration_versions');
    const versionCols = ConfigurationVersionsTable.columns.map((c: ColumnDefinition) => c.name);
    expect(versionCols).toEqual(
      expect.arrayContaining([
        'id',
        'environment_id',
        'version',
        'snapshot',
        'checksum',
        'created_by',
      ]),
    );

    expect(AuditEventsTable.tableName).toBe('audit_events');
    const auditCols = AuditEventsTable.columns.map((c: ColumnDefinition) => c.name);
    expect(auditCols).toEqual(
      expect.arrayContaining([
        'id',
        'organization_id',
        'actor_id',
        'action',
        'resource_type',
        'resource_id',
        'before',
        'after',
      ]),
    );
  });

  it('should verify Users, Roles, and APIKeys schema structure', () => {
    expect(UsersTable.tableName).toBe('users');
    expect(RolesTable.tableName).toBe('roles');
    expect(ApiKeysTable.tableName).toBe('api_keys');

    const roleOrgCol = RolesTable.columns.find(
      (c: ColumnDefinition) => c.name === 'organization_id',
    );
    expect(roleOrgCol?.references?.table).toBe('organizations');

    const apiKeyOrgCol = ApiKeysTable.columns.find(
      (c: ColumnDefinition) => c.name === 'organization_id',
    );
    expect(apiKeyOrgCol?.references?.table).toBe('organizations');
  });

  it('should verify explicit database indexes defined across core tables (Phase 2.3)', () => {
    expect(ProjectsTable.indexes?.map((i) => i.name)).toEqual([
      'idx_projects_organization_id',
      'idx_projects_key',
      'idx_projects_org_key',
    ]);

    expect(EnvironmentsTable.indexes?.map((i) => i.name)).toEqual([
      'idx_environments_project_id',
      'idx_environments_key',
      'idx_environments_proj_key',
    ]);

    expect(FeatureFlagsTable.indexes?.map((i) => i.name)).toEqual([
      'idx_feature_flags_environment_id',
      'idx_feature_flags_key',
      'idx_feature_flags_env_key',
      'idx_feature_flags_enabled',
    ]);

    expect(ConfigurationVersionsTable.indexes?.map((i) => i.name)).toEqual([
      'idx_config_versions_env_id',
      'idx_config_versions_env_version',
      'idx_config_versions_checksum',
    ]);
  });
});
