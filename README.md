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
│   ├── dashboard/          # Next.js management UI
│   ├── control-api/        # Fastify / TypeScript Management API
│   └── distribution-api/  # High-throughput Distribution API
│
├── packages/
│   ├── contracts/          # Shared Zod schemas and TypeScript interfaces
│   ├── config-model/       # Domain and snapshot data models
│   ├── hashing/            # Deterministic canonical hashing (10,000 buckets)
│   ├── rule-engine/        # Context condition & operator evaluation
│   ├── rollout-engine/     # Percentage rollout & threshold calculation
│   ├── evaluation-engine/  # Combined in-memory evaluation pipeline
│   └── config-client/      # SDK configuration store & caching adapters
│
├── sdks/
│   ├── javascript/         # Browser SDK (@controlplane/sdk)
│   ├── node/               # Node.js SDK (@controlplane/node)
│   └── flutter/            # Flutter / Dart SDK (controlplane_flutter)
│
├── tests/
│   ├── contract/           # Contract validation & golden test vectors
│   └── integration/        # Cross-package end-to-end integration tests
│
├── infrastructure/         # Docker Compose, PostgreSQL init scripts
└── docs/                   # Product definition, ADRs, API & SDK documentation
```

---

## Quick Start & Developer Toolchain

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Commands

```bash
# Install dependencies across all workspaces
pnpm install

# Build all packages & apps
pnpm build

# Run all unit, contract, and integration tests
pnpm test

# Run unit tests only
pnpm run test:unit

# Run integration tests only
pnpm run test:integration

# Typecheck all packages
pnpm run typecheck

# Check formatting and linting
pnpm run format:check
pnpm run lint
```

---

## Roadmap & Progress Tracking

| Milestone / Phase                              |             Status             | Key Deliverables                                                                                                                                                                                                                                                        |
| :--------------------------------------------- | :----------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Milestone 0: Project Foundation**            | :white_check_mark: In Progress | Monorepo setup, packages, toolchain, CI pipeline, architecture docs, ADRs                                                                                                                                                                                               |
| ├── **Phase 0.1: Product Definition**          |  :white_check_mark: Completed  | [Product Definition Spec](docs/architecture/product-definition.md), Glossary, Non-Goals, Boundaries ([Report](docs/reports/phase-0.1-verification-report.md))                                                                                                           |
| ├── **Phase 0.2: Control Plane vs Data Plane** |  :white_check_mark: Completed  | [Control vs Data Plane Architecture](docs/architecture/control-vs-data-plane.md), [ADR-001](docs/decisions/ADR-001-control-plane-vs-data-plane.md), [ADR-002](docs/decisions/ADR-002-why-local-evaluation.md) ([Report](docs/reports/phase-0.2-verification-report.md)) |
| ├── **Phase 0.3: Monorepo Setup**              | :hourglass_flowing_sand: Next  | Complete package boundaries and monorepo structure                                                                                                                                                                                                                      |
| ├── **Phase 0.4: Development Toolchain**       |  :white_check_mark: Completed  | TypeScript strict, ESLint, Prettier, Vitest                                                                                                                                                                                                                             |
| └── **Phase 0.5: CI Foundation**               |  :white_check_mark: Completed  | GitHub Actions workflow (`.github/workflows/ci.yml`)                                                                                                                                                                                                                    |
| **Milestone 1: Core Domain Model**             |     :white_circle: Pending     | Tenant isolation, Organization, Project, Environment, Flag, Rule, Rollout models                                                                                                                                                                                        |
| **Milestones 2–29**                            |     :white_circle: Pending     | Persistence, APIs, SDKs, Dashboard, Hardening, Release Readiness                                                                                                                                                                                                        |

---

## License

Licensed under the [Apache-2.0 License](LICENSE).
