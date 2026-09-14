-- Rollback Migration 005: Users, Roles, Organization Members, and API Keys
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
