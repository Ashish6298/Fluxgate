-- Migration 006: Comprehensive Performance & Relational Indexes
-- Indexes for Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- Indexes for Projects
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_key ON projects(key);
CREATE INDEX IF NOT EXISTS idx_projects_org_key ON projects(organization_id, key);

-- Indexes for Environments
CREATE INDEX IF NOT EXISTS idx_environments_project_id ON environments(project_id);
CREATE INDEX IF NOT EXISTS idx_environments_key ON environments(key);
CREATE INDEX IF NOT EXISTS idx_environments_proj_key ON environments(project_id, key);

-- Indexes for Feature Flags
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment_id ON feature_flags(environment_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_env_key ON feature_flags(environment_id, key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- Indexes for Targeting Rules
CREATE INDEX IF NOT EXISTS idx_targeting_rules_feature_flag_id ON targeting_rules(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_targeting_rules_priority ON targeting_rules(feature_flag_id, priority ASC);
CREATE INDEX IF NOT EXISTS idx_targeting_rules_enabled ON targeting_rules(enabled);

-- Indexes for Rollouts
CREATE INDEX IF NOT EXISTS idx_rollouts_feature_flag_id ON rollouts(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_rollouts_enabled ON rollouts(enabled);

-- Indexes for Configuration Versions
CREATE INDEX IF NOT EXISTS idx_config_versions_env_id ON configuration_versions(environment_id);
CREATE INDEX IF NOT EXISTS idx_config_versions_env_version ON configuration_versions(environment_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_config_versions_checksum ON configuration_versions(checksum);

-- Indexes for Audit Events
CREATE INDEX IF NOT EXISTS idx_audit_events_org_id ON audit_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);

-- Indexes for Users & Roles
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_roles_org_id ON roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_org_name ON roles(organization_id, name);

-- Indexes for Organization Members
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role_id ON organization_members(role_id);

-- Indexes for API Keys
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_env_id ON api_keys(environment_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
