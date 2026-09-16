# CONTROLPLANE

> **Developer-first, self-hostable feature delivery platform** built around deterministic local evaluation, stable percentage rollouts, immutable configuration versioning, instant rollback, and resilient SDK caching.

---

## Core Product Statement

> **CONTROLPLANE is a developer-first feature delivery platform that allows applications to remotely control feature exposure using locally evaluated configuration, deterministic percentage rollouts, rule-based targeting, configuration versioning, and instant rollback.**

---

## Architecture Overview

CONTROLPLANE separates **feature deployment** from **feature release** across three non-overlapping architectural planes:

```text
                        USERS & DEVELOPERS
                                │
                                ▼
                       MANAGEMENT DASHBOARD
                                │
                                ▼
                           CONTROL API
                                │
                                ▼
                            POSTGRESQL
                                │
                      CONFIGURATION SNAPSHOTS
                                │
                                ▼
                         DISTRIBUTION API
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
        Flutter SDK       JavaScript SDK        Node SDK
             │                  │                  │
             └──────────────────┼──────────────────┘
                                │
                                ▼
                           LOCAL CACHE
                                │
                                ▼
                        LOCAL EVALUATION
                                │
                                ▼
                       APPLICATION BEHAVIOR
```

---

## Non-Overlapping Plane Model

1. **Control Plane (`apps/control-api`, `apps/dashboard`)**: Manages organizations, projects, environments, flags, rules, rollouts, immutable versions, OCC, rollback, audit logs, and scoped SDK keys.
2. **Data Plane (`apps/distribution-api`)**: Read-only, high-throughput snapshot delivery supporting conditional requests (`ETag` / `304 Not Modified`). Contains **zero** runtime evaluation logic.
3. **SDK Layer (`sdks/javascript`, `sdks/node`, `sdks/flutter`)**: 100% In-memory local evaluation (<0.1ms), persistent Last Known Good caching, deterministic hashing (10,000 buckets), and offline resilience.

---

## Core Invariants

1. **Deterministic Evaluation**: Same configuration + same context = identical evaluation result across every SDK.
2. **Zero Evaluation Network Latency**: `isEnabled()` evaluates 100% locally in-memory.
3. **Immutable History**: Every configuration change creates a new snapshot version ($v_1, v_2, \dots$); historical versions are never mutated.
4. **Resilient Failure Modes**: Network outages gracefully fall back to the Last Known Good (LKG) cache or safe defaults without crashing the host application.
5. **No Remote Code Injection**: Application binaries contain all execution paths; CONTROLPLANE only determines _"Should this feature execute for the given context, and with what typed configuration?"_.

---

## Monorepo Layout

```text
controlplane/
├── apps/
│   ├── dashboard/          # Next.js management UI (@controlplane/dashboard)
│   ├── control-api/        # Fastify / TypeScript Management API (@controlplane/control-api)
│   └── distribution-api/  # High-throughput Distribution API (@controlplane/distribution-api)
│
├── packages/
│   ├── contracts/          # Shared Zod schemas and TypeScript interfaces (@controlplane/contracts)
│   ├── config-model/       # Domain and snapshot data models (@controlplane/config-model)
│   ├── hashing/            # Deterministic canonical hashing (10,000 buckets) (@controlplane/hashing)
│   ├── rule-engine/        # Context condition & operator evaluation (@controlplane/rule-engine)
│   ├── rollout-engine/     # Percentage rollout & threshold calculation (@controlplane/rollout-engine)
│   ├── evaluation-engine/  # Combined in-memory evaluation pipeline (@controlplane/evaluation-engine)
│   └── config-client/      # SDK configuration store & caching adapters (@controlplane/config-client)
│
├── sdks/
│   ├── javascript/         # Browser SDK (@controlplane/sdk)
│   ├── node/               # Node.js SDK (@controlplane/node)
│   └── flutter/            # Flutter / Dart SDK (controlplane_flutter)
│
├── tests/
│   ├── contract/           # Contract validation & golden test vectors
│   ├── integration/        # Cross-package end-to-end integration tests
│   ├── compatibility/      # Cross-SDK hashing equivalence tests
│   └── load/               # Local evaluation throughput benchmarks
│
├── infrastructure/
│   ├── docker/             # Dockerfiles & docker-compose.yml
│   ├── database/           # PostgreSQL initialization scripts
│   └── deployment/         # Environment templates
│
├── docs/
│   ├── architecture/       # System diagrams, boundaries, DAG & domain specs
│   ├── decisions/          # Architecture Decision Records (ADRs)
│   ├── api/                # API specifications
│   ├── sdk/                # SDK guides
│   ├── operations/         # Reliability, toolchain & CI pipeline guides
│   └── reports/            # Milestone & Phase verification reports
└── scripts/                # Verification, cycle detection & build utilities
```

---

## Quick Start & Developer Toolchain

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Standard Commands

```bash
# 1. Install dependencies across all workspaces
pnpm install

# 2. Build all packages, apps, and SDKs
pnpm run build

# 3. Run all automated tests
pnpm test

# 4. Run unit tests only
pnpm run test:unit

# 5. Run integration tests only
pnpm run test:integration

# 6. Run contract & golden vector tests
pnpm run test:contract

# 7. Run cross-SDK compatibility tests
pnpm run test:compatibility

# 8. Run local evaluation load tests
pnpm run test:load

# 9. Typecheck all packages
pnpm run typecheck

# 10. Check formatting and linting
pnpm run format:check
pnpm run lint
```

---

## Roadmap & Progress Tracking

| Milestone / Phase                              |            Status             | Key Deliverables                                                                                                                                                                                                                                                        |
| :--------------------------------------------- | :---------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Milestone 0: Project Foundation**            | :white_check_mark: Completed  | Monorepo setup, packages, toolchain, CI pipeline, architecture docs, ADRs                                                                                                                                                                                               |
| ├── **Phase 0.1: Product Definition**          | :white_check_mark: Completed  | [Product Definition Spec](docs/architecture/product-definition.md), Glossary, Non-Goals, Boundaries ([Report](docs/reports/phase-0.1-verification-report.md))                                                                                                           |
| ├── **Phase 0.2: Control Plane vs Data Plane** | :white_check_mark: Completed  | [Control vs Data Plane Architecture](docs/architecture/control-vs-data-plane.md), [ADR-001](docs/decisions/ADR-001-control-plane-vs-data-plane.md), [ADR-002](docs/decisions/ADR-002-why-local-evaluation.md) ([Report](docs/reports/phase-0.2-verification-report.md)) |
| ├── **Phase 0.3: Monorepo Setup**              | :white_check_mark: Completed  | [Monorepo Structure & DAG](docs/architecture/monorepo-structure.md), 26 branches, 17 workspace packages, 0 cycles ([Report](docs/reports/phase-0.3-verification-report.md))                                                                                             |
| ├── **Phase 0.4: Development Toolchain**       | :white_check_mark: Completed  | [Toolchain Guide](docs/operations/development-toolchain.md), standard commands (`install`, `build`, `test`, `lint`, `typecheck`) ([Report](docs/reports/phase-0.4-verification-report.md))                                                                              |
| └── **Phase 0.5: CI Foundation**               | :white_check_mark: Completed  | GitHub Actions workflow (`.github/workflows/ci.yml`), [CI Architecture Guide](docs/operations/ci-pipeline.md) ([Report](docs/reports/phase-0.5-verification-report.md))                                                                                                 |
| **Milestone 1: Core Domain Model**             | :white_check_mark: Completed  | [Domain Model Spec](docs/architecture/domain-model.md), Complete 8-part core domain models, validation schemas & repos ([Report](docs/reports/milestone-1-verification-report.md))                                                                                      |
| ├── **Phase 1.1: Organization**                | :white_check_mark: Completed  | [Domain Model Spec](docs/architecture/domain-model.md), Organization schema, validation & unique tenant repo ([Report](docs/reports/phase-1.1-verification-report.md))                                                                                                  |
| ├── **Phase 1.2: Project**                     | :white_check_mark: Completed  | [Domain Model Spec](docs/architecture/domain-model.md), Project entity, organization scoping & unique stable keys ([Report](docs/reports/phase-1.2-verification-report.md))                                                                                             |
| ├── **Phase 1.3: Environment**                 | :white_check_mark: Completed  | [Domain Model Spec](docs/architecture/domain-model.md), Environment entity & independent configuration isolation ([Report](docs/reports/phase-1.3-verification-report.md))                                                                                              |
| ├── **Phase 1.4: Feature Flag**                | :white_check_mark: Completed  | [Domain Model Spec](docs/architecture/domain-model.md), Typed FeatureFlag entity (Boolean, String, Number, JSON) ([Report](docs/reports/phase-1.4-verification-report.md))                                                                                              |
| ├── **Phase 1.5: Targeting Rule**              | :white_check_mark: Completed  | [Domain Model Spec](docs/architecture/domain-model.md), Rule entity, operators, priority evaluation ([Report](docs/reports/phase-1.5-verification-report.md))                                                                                                           |
| ├── **Phase 1.6: Rollout**                     | :white_check_mark: Completed  | [Domain Model Spec](docs/architecture/domain-model.md), Rollout entity, percentage bounds, salt & deterministic bucketing ([Report](docs/reports/phase-1.6-verification-report.md))                                                                                     |
| ├── **Phase 1.7: Configuration Version**       | :white_check_mark: Completed  | [Domain Model Spec](docs/architecture/domain-model.md), Immutable ConfigurationVersion, snapshot checksum & rollback ([Report](docs/reports/phase-1.7-verification-report.md))                                                                                          |
| └── **Phase 1.8: Audit Event**                 | :white_check_mark: Completed  | [Domain Model Spec](docs/architecture/domain-model.md), Append-only AuditEvent, differential before/after tracking ([Report](docs/reports/phase-1.8-verification-report.md))                                                                                            |
| **Milestone 2: Database & Persistence**        | :white_check_mark: Completed  | [Persistence Architecture Spec](docs/architecture/domain-model.md), SQL migrations (001-006), constraints, transactions, repositories & test suite ([Report](docs/reports/milestone-2-verification-report.md))                                                          |
| ├── **Phase 2.1: PostgreSQL Setup**            | :white_check_mark: Completed  | PostgreSQL migration suite (001-006), dev & test profiles, database recreation runner ([Report](docs/reports/phase-2.1-verification-report.md))                                                                                                                         |
| ├── **Phase 2.2: Schema Implementation**       | :white_check_mark: Completed  | Schema definitions and migrations for 11 core tables (Organizations, Projects, Environments, Flags, Rules, Rollouts, Versions, Audit, Users, Roles, APIKeys) ([Report](docs/reports/phase-2.2-verification-report.md))                                                  |
| ├── **Phase 2.3: Database Constraints**        | :white_check_mark: Completed  | Primary keys, foreign keys, unique constraints (`orgId + projectKey`), required fields & indexes ([Report](docs/reports/phase-2.3-verification-report.md))                                                                                                              |
| ├── **Phase 2.4: Transaction Boundaries**      | :white_check_mark: Completed  | Atomic 4-step pipeline (Flag + Snapshot + Version + Audit), All-or-Nothing rollback invariant ([Report](docs/reports/phase-2.4-verification-report.md))                                                                                                                 |
| ├── **Phase 2.5: Repository Layer**            | :white_check_mark: Completed  | Decoupled Repository interfaces and PostgreSQL implementations for all 11 domain entities ([Report](docs/reports/phase-2.5-verification-report.md))                                                                                                                     |
| └── **Phase 2.6: Database Tests**              | :white_check_mark: Completed  | Comprehensive test suite covering migrations, constraints, transactions, concurrent updates, and foreign key protection ([Report](docs/reports/phase-2.6-verification-report.md))                                                                                       |
| **Milestone 3: Authentication**                | :hourglass_flowing_sand: Next | Registration, login, session/token management, authentication middleware, and auth verification                                                                                                                                                                         |
| **Milestones 4–29**                            |    :white_circle: Pending     | RBAC, Configuration Engine, Distribution API, Management API, SDKs, Dashboard, Resilience, Release                                                                                                                                                                      |

---

## License

Licensed under the [Apache-2.0 License](LICENSE).
