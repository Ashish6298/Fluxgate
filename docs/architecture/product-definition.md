# CONTROLPLANE — Complete Product Definition Specification

## 1. Product Name & Category

- **Product Name:** CONTROLPLANE
- **Category:** Developer Infrastructure / Feature Delivery & Configuration Management Platform
- **Target Release:** v1.0.0
- **License:** Apache-2.0

---

## 2. Core Product Statement

> **CONTROLPLANE is a developer-first feature delivery platform that allows applications to remotely control feature exposure using locally evaluated configuration, deterministic percentage rollouts, rule-based targeting, configuration versioning, and instant rollback.**

---

## 3. Product Purpose & Target Users

### Purpose

To separate **software deployment** (shipping compiled code to production) from **feature release** (exposing features to users). Engineering teams can safely ship dormant code, gradually roll out features, test in production with targeted beta users, and recover instantly from production defects without rebuilding or redeploying client binaries or server applications.

### Target Users

- **Software Engineers & Developers**: Requiring fast, reliable, zero-latency feature flagging and typed configuration in mobile, web, and backend services.
- **Engineering Leads & DevOps / SRE**: Requiring self-hostable developer infrastructure, tenant isolation, immutable audit history, instant rollbacks, and kill switches.
- **Product Managers**: Requiring progressive rollout control (5% → 20% → 50% → 100%) and rule-based targeting without deploying new software builds.

---

## 4. The Core Problem

Traditional software delivery tightly couples code deployment with feature exposure:

```text
Write Code ──► Build Binary ──► Test ──► Release / Deploy ──► Users Receive Update
```

When a problem occurs in production:

1. The bug impacts 100% of exposed users immediately.
2. Fixing it requires hotfixing code, rebuilding artifacts, submitting to app stores or re-running CI/CD pipelines, and waiting hours or days for user adoption.

CONTROLPLANE decouples deployment from release:

```text
Ship Feature Dormant (Disabled)
             │
             ▼
Enable Remotely for Internal / QA (Rule Targeting)
             │
             ▼
Progressive Rollout (5% ──► 20% ──► 50% ──► 100%)
             │
      [Defect Detected]
             ▼
Instant Remote Rollback / Kill Switch (0 ms Build Time)
```

---

## 5. Important Boundaries & Limitations

### Critical Invariant: No Remote Code Injection

CONTROLPLANE is **not** a remote code loader, plugin engine, or dynamic JavaScript injector.

- The feature code and all alternate execution paths **must already exist** inside the deployed application build.
- CONTROLPLANE only answers the decision:

```text
Should this feature execute for the given context, and with what typed configuration?
```

---

## 6. Architecture Philosophy & Engineering Principles

CONTROLPLANE is mission-critical developer infrastructure. It follows the principle:

> **Core correctness → deterministic behavior → reliability → SDKs → distribution → security → dashboard → release**

### Guiding Principles:

1. **Local Evaluation (Zero Network Latency)**: Flag evaluation happens 100% in-memory in the client SDK. Calling `isEnabled()` never makes an HTTP request.
2. **Deterministic Behavior**: Given the same configuration snapshot and evaluation context, every SDK (Flutter, JavaScript, Node) will produce the exact same result.
3. **Immutable History**: Configuration versions are strictly append-only ($v_1, v_2, v_3, \dots$). History is never overwritten.
4. **Resilient Failure Modes**: Outages or cache corruption fall back cleanly to Last Known Good configurations or safe hardcoded defaults without crashing the host application.
5. **No Premature Optimization & No Unnecessary Complexity**: Avoid unneeded distributed locks, streaming WebSockets, or machine learning pipelines before mastering core correctness.

---

## 7. v1.0.0 Scope

- **Data Models**: Multi-tenant Hierarchy (Organization $\to$ Project $\to$ Environment $\to$ FeatureFlag $\to$ TargetingRules $\to$ Rollouts).
- **Supported Flag Types**: Boolean, String, Number, JSON.
- **Evaluation Engine**: In-memory rule matching and deterministic percentage rollout computation.
- **Rule Engine Operators**:
  - String: `equals`, `notEquals`, `contains`, `startsWith`, `endsWith`, `in`, `notIn`
  - Numeric: `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`
  - SemVer: `versionEquals`, `versionGreaterThan`, `versionGreaterThanOrEqual`, `versionLessThan`, `versionLessThanOrEqual`
  - Existence: `exists`, `notExists`
  - Logical: `AND`, `OR`, `NOT`
- **Deterministic Hashing**: SHA-256 canonical hashing across 10,000 buckets ($0.01\%$ granularity) with monotonic rollout stability.
- **Configuration Snapshots**: Normalized, schema-validated JSON snapshots with cryptographic checksums.
- **Configuration Management**: Optimistic Concurrency Control (OCC), immutable versions, instant rollback API, and emergency kill switches.
- **Distribution API**: Read-only, high-throughput endpoint supporting conditional HTTP caching (`ETag` / `304 Not Modified`).
- **SDKs**: Official Flutter (`controlplane_flutter`), JavaScript (`@controlplane/sdk`), and Node.js (`@controlplane/node`) SDKs.
- **Security & Multi-Tenancy**: Organization tenant isolation, RBAC (Owner, Admin, Developer, Viewer), scoped SDK API keys.
- **Observability**: Append-only Audit Event logs, structured request logging, and operational metrics.
- **Self-Hosting**: Docker & Docker Compose setup with PostgreSQL persistence.
- **Dashboard**: Modern Next.js management interface for flag, rule, rollout, version, and audit management.

---

## 8. Non-Goals for v1.0.0

The following features are explicitly excluded from v1.0.0 to focus on zero-defect correctness:

- ❌ **No Real-time WebSocket / SSE Streaming**: Configuration updates use lightweight conditional HTTP polling with ETags.
- ❌ **No Automatic Canary Analysis / ML Rollouts**: Progressive rollouts are driven manually or via scripts.
- ❌ **No A/B Testing Statistics & Analytics Engine**: CONTROLPLANE does not store telemetry analytics or statistical p-value models in v1.0.0.
- ❌ **No Billing or Subscription Management**: Focus is strictly on open developer infrastructure.
- ❌ **No Kubernetes Requirement**: Multi-container Docker Compose is the standard target for v1.0.0.
- ❌ **No Dynamic Remote Code Execution**: System only distributes configuration parameters.

---

## 9. Core Terminology & Glossary

| Term                       | Definition                                                                                                                                                                   |
| :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Organization**           | The top-level tenant boundary representing a company or organization.                                                                                                        |
| **Project**                | An application, product, or software system under an organization (e.g. `mobile-app`, `web-store`).                                                                          |
| **Environment**            | An isolated configuration tier within a project (e.g. `development`, `staging`, `production`). Configuration does not cross environment boundaries.                          |
| **Feature Flag**           | A remotely controlled configuration entity with a unique key, type (Boolean, String, Number, JSON), default value, and enabled status.                                       |
| **Targeting Rule**         | A prioritized conditional rule that overrides flag values for contexts matching specific attribute predicates.                                                               |
| **Percentage Rollout**     | A gradual feature exposure mechanism allocating a deterministic subset of users ($0\%$ to $100\%$) based on canonical hash bucketing.                                        |
| **Canonical Input**        | A standard composite string (`projectKey:environmentKey:flagKey:userIdentifier:salt`) passed into the deterministic hash function.                                           |
| **Bucket**                 | An integer in the range $[0, 9999]$ derived from the hash of the canonical input.                                                                                            |
| **Threshold**              | The target bucket integer representing the rollout percentage (e.g. $25\% \implies 2500$). Users with $\text{bucket} < \text{threshold}$ receive the feature.                |
| **Rollout Stability**      | The mathematical guarantee that increasing a rollout percentage will never evict previously eligible users.                                                                  |
| **Configuration Snapshot** | A complete, normalized, self-contained JSON representation of all flags, rules, and rollouts for a single environment.                                                       |
| **Checksum**               | A cryptographic hash of the snapshot content used to verify payload integrity and detect corruption.                                                                         |
| **Configuration Version**  | An immutable, monotonically increasing integer ($v_1, v_2, \dots$) identifying the snapshot state.                                                                           |
| **Rollback**               | Restoring an earlier configuration state by creating a new version ($v_{n+1}$) containing the exact payload of an earlier version ($v_k$).                                   |
| **Kill Switch**            | An emergency action instantly disabling a feature and publishing a new configuration snapshot.                                                                               |
| **Last Known Good (LKG)**  | The most recent valid configuration snapshot successfully cached by the SDK, used as fallback during network or distribution server outages.                                 |
| **Safe Default**           | The hardcoded fallback value provided by the application code in case a flag is unknown, disabled, or unresolvable.                                                          |
| **Evaluation Context**     | The dictionary of user identifiers and contextual attributes (e.g. `userId`, `country`, `platform`, `appVersion`, `customAttributes`) supplied during flag evaluation.       |
| **Evaluation Reason**      | Metadata returned with the evaluation result detailing why a decision was reached (e.g. `DEFAULT`, `TARGETING_RULE`, `PERCENTAGE_ROLLOUT`, `FLAG_DISABLED`, `UNKNOWN_FLAG`). |
| **Local Evaluation**       | Computing feature flag decisions entirely in the client application's memory without outbound network calls.                                                                 |
