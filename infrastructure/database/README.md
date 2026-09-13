# Database Infrastructure

CONTROLPLANE uses PostgreSQL for multi-tenant relational persistence, version snapshots, and audit logging.

## Directories

- `01-init.sql`: Initialization DDL executed on fresh container creation.
