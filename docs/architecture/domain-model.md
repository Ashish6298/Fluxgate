# CONTROLPLANE — Domain Model Architecture

## 1. Hierarchy & Multi-Tenant Model

CONTROLPLANE organizes all features, configurations, and governance under a strict multi-tenant hierarchy:

```text
Organization (Tenant Root)
      │
      ├── Users & Roles (RBAC)
      │
      ├── Projects (Software Applications / Services)
      │     │
      │     ├── Environments (e.g., Development, Staging, Production)
      │     │     │
      │     │     ├── Feature Flags (Typed: Boolean, String, Number, JSON)
      │     │     │     │
      │     │     │     ├── Targeting Rules (Priority-based Conditions)
      │     │     │     │
      │     │     │     └── Percentage Rollouts (Deterministic Bucketing)
      │     │     │
      │     │     └── Configuration Versions (Immutable Snapshots & History)
      │     │
      │     └── Scoped SDK API Keys
      │
      └── Audit Events (Append-Only Governance Log)
```

---

## 2. Organization (Phase 1.1)

### Responsibility

The **Organization** entity represents an isolated tenant (company, organization, or team unit).

### Strict Tenant Invariant

```text
Tenant A CANNOT access, view, or mutate resources belonging to Tenant B.
```

All project lookups, environment lookups, flag evaluations, and administrative operations are scoped to an explicit Organization ID.

### Schema Definition

```typescript
interface Organization {
  id: string; // UUID v4 format
  name: string; // Trimmed, 1-255 characters
  createdAt: string; // ISO 8601 UTC timestamp
  updatedAt: string; // ISO 8601 UTC timestamp
}
```

### Validation Constraints

1. **Identifier Uniqueness**: Every organization must possess a globally unique UUID.
2. **Name Constraints**: Non-empty, trimmed, maximum 255 characters.
3. **Immutability of `id` & `createdAt`**: Tenant IDs and creation timestamps cannot be mutated after creation.
4. **Relationship Ownership**: An Organization owns multiple Projects, Members, and Audit Events. Deleting an Organization cascades cleanly to all contained child projects and environments.

---

## 3. Project (Phase 1.2)

### Responsibility

The **Project** entity represents an application, service, microservice, or product boundary within an Organization (e.g., `web-frontend`, `checkout-service`, `mobile-app`).

### Relationship

```text
Organization
      │
      ├── Project A (e.g., "checkout-service")
      │
      └── Project B (e.g., "mobile-app")
```

### Schema Definition

```typescript
interface Project {
  id: string; // UUID v4 format
  organizationId: string; // Parent Organization UUID v4
  name: string; // Human-readable name, 1-255 characters
  key: string; // Stable slug / URL-safe key (2-63 chars, lowercase kebab-case)
  createdAt: string; // ISO 8601 UTC timestamp
  updatedAt: string; // ISO 8601 UTC timestamp
}
```

### Key Invariants & Validation Constraints

1. **Key Stability & Slug Formatting**: Project keys must follow `/^[a-z0-9]+(-[a-z0-9]+)*$/` (lowercase alphanumeric and single hyphens, 2 to 63 characters). Once created, keys are **immutable** to prevent breaking SDK configurations, URLs, and telemetry streams.
2. **Organization-Scoped Key Uniqueness**: The compound tuple `(organizationId, key)` must be strictly unique. Two different organizations can have a project with the same key (e.g. `web-app`), but a single organization cannot have duplicate project keys.
3. **Global ID Uniqueness**: Every project has a unique UUID v4 primary identifier.
4. **Relational Isolation**: All projects belong strictly to a valid `organizationId`. Lookups and operations enforce parent tenant isolation.

---

## 4. Environment (Phase 1.3)

### Responsibility

The **Environment** entity represents a deployment target, execution tier, or runtime stage (e.g. `Development`, `Staging`, `Production`, `QA`) within a Project.

### Relationship

```text
Project
  │
  ├── Development (Sandbox / local experimentation)
  │
  ├── Staging (Pre-production validation & integration testing)
  │
  └── Production (Live user-facing traffic)
```

### Schema Definition

```typescript
type EnvironmentType = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' | 'CUSTOM';

interface Environment {
  id: string; // UUID v4 format
  projectId: string; // Parent Project UUID v4
  name: string; // Human-readable name, 1-255 characters
  key: string; // Stable slug / URL-safe key (2-63 chars, lowercase kebab-case)
  type: EnvironmentType; // Environment classification tier
  createdAt: string; // ISO 8601 UTC timestamp
  updatedAt: string; // ISO 8601 UTC timestamp
}
```

### Key Invariants & Validation Constraints

1. **Environment-Specific Isolation Rule**: **Configuration is strictly environment-specific.** A feature flag change, rule creation, or rollout update in `Development` **MUST NOT** automatically affect or propagate to `Production` or any sibling environment.
2. **Project-Scoped Key Uniqueness**: The compound tuple `(projectId, key)` must be unique. A project cannot have two environments with key `production`, but different projects can each define their own `production` environment.
3. **Key Stability**: Environment slugs (`key`) are validated kebab-case strings (`/^[a-z0-9]+(-[a-z0-9]+)*$/`, 2 to 63 chars) and remain immutable once provisioned to ensure SDK configuration stability.
4. **Global ID Uniqueness**: Every environment has a globally unique UUID v4 identifier.
