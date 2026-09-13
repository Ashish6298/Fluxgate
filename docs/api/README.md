# CONTROLPLANE API Specifications

## 1. Management API (`apps/control-api`)

Prefix: `/api/v1/`
Handles tenant management, flags, rules, rollouts, versioning, rollback, users, and audit logs.

## 2. Distribution API (`apps/distribution-api`)

Prefix: `/sdk/v1/`
Handles read-only snapshot retrieval with conditional HTTP `ETag` caching.
