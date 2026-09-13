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

---

## 5. Feature Flag (Phase 1.4)

### Responsibility

The **Feature Flag** entity represents a dynamically controllable feature toggle or typed configuration parameter within an Environment.

### Relationship

```text
Environment
  │
  ├── FeatureFlag: "new_checkout" (Boolean)
  ├── FeatureFlag: "hero_title" (String)
  ├── FeatureFlag: "max_items" (Number)
  └── FeatureFlag: "tier_config" (JSON)
```

### Schema Definition

```typescript
type FlagType = 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
type FeatureFlagValue = boolean | string | number | Record<string, unknown> | unknown[] | null;

interface FeatureFlag {
  id: string; // UUID v4 format
  environmentId: string; // Parent Environment UUID v4
  key: string; // Identifier slug (snake_case / kebab-case, 2-64 chars)
  name: string; // Human-readable flag name (1-255 chars)
  description?: string; // Optional description of flag purpose (max 1024 chars)
  type: FlagType; // Data type contract (BOOLEAN | STRING | NUMBER | JSON)
  defaultValue: FeatureFlagValue; // Type-checked default fallback value
  enabled: boolean; // Master toggle switch (true = enabled, false = disabled)
  createdAt: string; // ISO 8601 UTC timestamp
  updatedAt: string; // ISO 8601 UTC timestamp
}
```

### Key Invariants & Validation Constraints

1. **Strict Type Matching**: The `defaultValue` must strictly match the declared `type`:
   - `BOOLEAN`: must be `true` or `false`.
   - `STRING`: must be a valid UTF-8 string.
   - `NUMBER`: must be a finite number (`!Number.isNaN(v) && Number.isFinite(v)`).
   - `JSON`: must be a valid JSON-serializable value (object, array, string, number, boolean, null).
2. **Environment-Scoped Key Uniqueness**: The compound tuple `(environmentId, key)` is unique. A flag key `new_checkout` can coexist in `development` (enabled = true) and `production` (enabled = false) without mutual interference.
3. **Key Format & Stability**: Flag keys must follow `/^[a-z0-9]+([-_][a-z0-9]+)*$/` (lowercase alphanumeric with hyphens or underscores, 2 to 64 chars). Once provisioned, keys are immutable to preserve code references.
4. **Master Kill-Switch**: When `enabled: false`, the local evaluation engine immediately serves `defaultValue` with reason `FLAG_DISABLED` without evaluating rules or rollouts.

---

## 6. Targeting Rule (Phase 1.5)

### Responsibility

The **Targeting Rule** entity represents a conditional targeting clause evaluated in-memory against a provided evaluation context (e.g. `userId`, `platform`, `country`, `appVersion`, or `customAttributes`).

### Relationship

```text
FeatureFlag
  │
  ├── TargetingRule #0 (Priority 0): IF platform == "android" AND country == "IN" THEN true
  ├── TargetingRule #1 (Priority 1): IF userId IN ["beta_1", "beta_2"] THEN true
  └── Default Fallback Value: false
```

### Schema Definition

```typescript
type RuleOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'IN'
  | 'NOT_IN'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL'
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn';

interface RuleCondition {
  attribute: string; // Context attribute name (e.g., "platform", "country", "userId")
  operator: RuleOperator; // Match operator
  value: FeatureFlagValue; // Comparison target value
}

interface TargetingRule {
  id: string; // UUID v4 format
  featureFlagId: string; // Parent FeatureFlag UUID v4
  priority: number; // Non-negative integer (0 = highest precedence)
  conditions: RuleCondition[]; // Conjunction of conditions (AND)
  value: FeatureFlagValue; // Return value when all conditions match
  enabled: boolean; // Active state of rule
  createdAt: string; // ISO 8601 UTC timestamp
  updatedAt: string; // ISO 8601 UTC timestamp
}
```

### Key Invariants & Evaluation Semantics

1. **Priority Ordering**: Rules are evaluated strictly in ascending order of `priority` ($0, 1, 2, \dots$). The first matching enabled rule immediately determines the evaluation result (`TARGETING_RULE`).
2. **Conjunctive Conditions (AND)**: Within a single rule, all conditions must evaluate to `true` for the rule to match.
3. **Local In-Memory Execution**: Rule evaluation is 100% in-memory and synchronous, executing in $<0.1\text{ms}$ with 0 network calls.
4. **Flag Scoping**: Every targeting rule belongs strictly to a valid `featureFlagId`.

---

## 7. Rollout (Phase 1.6)

### Responsibility

The **Rollout** entity represents a deterministic percentage-based rollout mechanism used to gradually expose a feature flag to a controlled subset of users (e.g. 10%, 25%, 50%, 100%).

### Relationship

```text
FeatureFlag
  │
  ├── Targeting Rules (Evaluated First)
  │
  └── Rollout (Evaluated Second)
        │
        ├── Percentage: 25% (2,500 of 10,000 buckets)
        └── Salt: "v1" (Hashing entropy & cohort re-randomization)
```

### Schema Definition

```typescript
interface Rollout {
  id: string; // UUID v4 format
  featureFlagId: string; // Parent FeatureFlag UUID v4
  percentage: number; // Rollout percentage in [0, 100] (e.g., 25)
  salt: string; // Non-empty hashing salt (e.g., "v1")
  enabled: boolean; // Active state of percentage rollout
  createdAt: string; // ISO 8601 UTC timestamp
  updatedAt: string; // ISO 8601 UTC timestamp
}
```

### Key Invariants & Bucketing Mechanics

1. **Deterministic Hashing (No Random Numbers)**:
   - Canonical hash input: `projectKey:environmentKey:flagKey:userIdentifier:salt`
   - Algorithm: `SHA-256` digest converted to 32-bit unsigned integer modulo `10000` $\to$ bucket range $[0, 9999]$ ($0.01\%$ granularity).
   - Evaluation: User is included if `bucket < percentage * 100`.
2. **Monotonic Cohort Stability**:
   - As rollout percentage expands ($5\% \to 10\% \to 25\% \to 50\%$), the user's bucket remains invariant; only the threshold increases.
   - **Guaranteed**: Any user exposed at $25\%$ is guaranteed to remain exposed at $50\%$.
3. **Cohort Re-Randomization via Salt**:
   - Updating `salt` (e.g., from `v1` to `v2`) re-hashes all users to independent buckets, enabling a fresh canary cohort without changing the percentage.
4. **Single Rollout per Feature Flag**:
   - Each feature flag contains at most one primary percentage rollout configuration.

---

## 8. Configuration Version (Phase 1.7)

### Responsibility

The **Configuration Version** entity represents an immutable, append-only point-in-time snapshot and audit record of an Environment's full configuration payload (flags, rules, and rollouts).

### Relationship

```text
Environment
  │
  ├── v1 (Initial flag creation)
  ├── v2 (Add targeting rules)
  ├── v3 (Expand rollout to 25%)
  └── v4 (Rollback to v1 snapshot)
```

### Schema Definition

```typescript
interface ConfigurationVersion {
  id: string; // UUID v4 format
  environmentId: string; // Parent Environment UUID v4
  version: number; // Monotonically increasing positive integer (1, 2, 3, ...)
  snapshot: ConfigurationSnapshot; // Complete normalized JSON snapshot
  checksum: string; // SHA-256 integrity checksum over normalized snapshot
  createdBy: string; // User ID / Actor key who created this version
  reason: string; // Human-readable change description
  createdAt: string; // ISO 8601 UTC timestamp
}
```

### Key Invariants & Immutability Rules

1. **Strict Immutability**:
   - Configuration versions are **read-only and immutable**. Once written, a version record can **never** be updated, overwritten, or modified.
   - Any configuration change (flag toggle, rule edit, rollout change) publishes a **new** incremented version ($v_{\text{next}} = v_{\text{latest}} + 1$).
2. **Auditability & Safe Rollback**:
   - Rolling back does **not** erase or mutate history. To rollback from $v43$ to $v41$, the system provisions $v44$ carrying the exact payload from $v41$ with `reason: "Rollback to version 41"`.
3. **Deterministic Checksums**:
   - Every version computes a deterministic `SHA-256` checksum over its normalized configuration snapshot, guarding against corruption and tampering.
4. **Optimistic Concurrency Control (OCC)**:
   - Modifications supply an expected `baseVersion`. If the environment's current version has advanced, the update is safely rejected with a conflict error.

---

## 9. Audit Event (Phase 1.8)

### Responsibility

The **Audit Event** entity represents an immutable, append-only governance and operational log entry capturing every state change, feature toggle, rollout modification, and configuration mutation within an Organization.

### Relationship

```text
Organization (Tenant Root)
  │
  ├── Audit Events (Append-Only Governance Log)
  │     ├── Event #1: CREATE_FEATURE_FLAG (new_checkout) by admin
  │     ├── Event #2: UPDATE_ROLLOUT (before: 10%, after: 25%) by developer_123
  │     └── Event #3: ROLLBACK_CONFIGURATION (v43 -> v44) by incident_responder
```

### Schema Definition

```typescript
interface AuditEvent {
  id: string; // UUID v4 format
  organizationId: string; // Parent Organization UUID v4
  actorId: string; // User ID / Actor key who initiated action
  action: string; // Operation action code (e.g., "UPDATE_ROLLOUT", "CREATE_FLAG")
  resourceType: string; // Resource class (e.g., "FEATURE_FLAG", "ROLLOUT")
  resourceId: string; // ID of targeted resource
  before: Record<string, unknown> | null; // Previous state snapshot (null on creation)
  after: Record<string, unknown> | null; // New state snapshot (null on deletion)
  createdAt: string; // ISO 8601 UTC timestamp
}
```

### Key Invariants & Governance Rules

1. **Strict Append-Only Immutability**:
   - Audit events are **permanent and immutable**. Once created, an audit event cannot be updated, edited, or deleted under any circumstance.
2. **Comprehensive Differential Audit (Before & After)**:
   - State mutations store structured differential payloads (`before` and `after`), enabling exact reconstruction of historical configurations.
   - Resource creations record `before: null` and `after: { ... }`.
   - Resource deletions record `before: { ... }` and `after: null`.
3. **Tenant Root Scoping**:
   - Every audit event is scoped strictly to an `organizationId`, preventing cross-tenant leakage.
4. **Multi-Dimensional Indexing**:
   - Audit logs support querying by Organization (`listByOrganization`), by Resource (`listByResource`), and by Actor (`listByActor`) in strict chronological order.

---

## 10. Milestone 1 Core Domain Model Completion Summary

With Phase 1.8 complete, **Milestone 1 — Core Domain Model** is 100% defined, implemented, and verified across all layers:

| Phase   | Domain Entity             | Primary Invariants & Capabilities                                                                         |
| :------ | :------------------------ | :-------------------------------------------------------------------------------------------------------- |
| **1.1** | **Organization**          | Tenant root, strict multi-tenant data isolation, global UUID uniqueness                                   |
| **1.2** | **Project**               | Scoped application boundaries, unique slug keys `(organizationId, key)`                                   |
| **1.3** | **Environment**           | Independent runtime tiers (`DEVELOPMENT`, `STAGING`, `PRODUCTION`, `CUSTOM`), configuration isolation     |
| **1.4** | **Feature Flag**          | Typed flags (`BOOLEAN`, `STRING`, `NUMBER`, `JSON`), type-safe defaults, master kill switches             |
| **1.5** | **Targeting Rule**        | Priority-ordered clauses ($0, 1, 2, \dots$), conjunctive condition evaluation (`AND`), rich operators     |
| **1.6** | **Rollout**               | Bounded percentage $[0, 100]$, deterministic SHA-256 bucketing ($0 \to 9999$), monotonic cohort stability |
| **1.7** | **Configuration Version** | Immutable point-in-time snapshots, deterministic SHA-256 checksums, non-destructive rollbacks             |
| **1.8** | **Audit Event**           | Append-only governance trail, structured before/after diffs, actor attribution                            |
