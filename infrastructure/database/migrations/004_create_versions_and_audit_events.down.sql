-- Rollback Migration 004: Configuration Versions and Audit Events
DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS configuration_versions CASCADE;
