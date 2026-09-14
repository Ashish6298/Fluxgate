-- Rollback Migration 003: Feature Flags, Targeting Rules, Rollouts
DROP TABLE IF EXISTS rollouts CASCADE;
DROP TABLE IF EXISTS targeting_rules CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
