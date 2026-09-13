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
