# CONTROLPLANE — Control Plane vs Data Plane Architecture Specification

## 1. Architectural Overview & Three-Plane Model

CONTROLPLANE strictly enforces a three-plane architecture where responsibilities are cleanly isolated with zero functional overlap.

```text
                               ┌────────────────────────┐
                               │       DEVELOPERS       │
                               │        & USERS         │
                               └───────────┬────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             1. CONTROL PLANE                                     │
│                        (Dashboard + Management API)                              │
│                                                                                  │
│   • Organizations (Tenants)       • Feature Flags (Typed Values)                 │
│   • Projects (Apps / Services)     • Targeting Rules & Priorities                 │
│   • Environments (Isolated Tiers)  • Percentage Rollouts & Salts                  │
│   • Users, Sessions & Auth        • Version History & Snapshots                  │
│   • RBAC Authorization Engine      • Restorative Rollback System                  │
│   • Scoped SDK API Key Management  • Append-Only Audit Event Log                  │
└──────────────────────────────────────────┬───────────────────────────────────────┘
                                           │
                         Publishes Immutable Snapshot & Version
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             2. DATA PLANE                                        │
│                         (Distribution Service)                                   │
│                                                                                  │
│   • High-Throughput Distribution Endpoint: GET /sdk/v1/config                    │
│   • SDK API Key Authentication & Environment Scoping                             │
│   • Configuration Version Checking & Metadata Serving                            │
│   • Conditional Request Processing (ETag / If-None-Match ──► 304 Not Modified)   │
│   • Strict Invariant: ZERO Runtime Flag Evaluation Logic                         │
└──────────────────────────────────────────┬───────────────────────────────────────┘
                                           │
                         Synchronizes Snapshot via Conditional HTTP
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             3. SDK LAYER                                         │
│                      (Flutter, JavaScript, Node SDKs)                            │
│                                                                                  │
│   • Local Persistent / Memory Cache (Last Known Good Configuration)              │
│   • Snapshot Schema & Checksum Integrity Validation                              │
│   • Atomic In-Memory Snapshot Replacement                                        │
│   • 100% In-Memory Rule Evaluation (Zero Outbound HTTP Calls)                    │
│   • Deterministic Canonical Hashing & 10,000-Bucket Rollouts                     │
│   • Offline Resilience & Safe Default Fallback Protection                        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Non-Overlapping Boundary Matrix

To preserve system reliability and prevent architectural degradation, responsibilities are partitioned as follows:

| Responsibility / Capability                |     Control Plane      |          Data Plane          |        SDK Layer         | Rationale / Invariant                           |
| :----------------------------------------- | :--------------------: | :--------------------------: | :----------------------: | :---------------------------------------------- |
| **Org / Project / Environment CRUD**       | :white_check_mark: YES |            ❌ NO             |          ❌ NO           | Administrative domain boundary.                 |
| **Flag / Rule / Rollout Authoring**        | :white_check_mark: YES |            ❌ NO             |          ❌ NO           | Mutations require OCC and transaction locks.    |
| **RBAC & User Session Authentication**     | :white_check_mark: YES |            ❌ NO             |          ❌ NO           | Management security perimeter.                  |
| **Snapshot Generation & Checksums**        | :white_check_mark: YES |            ❌ NO             |          ❌ NO           | Snapshots are normalized at write time.         |
| **Immutable Version & Rollback**           | :white_check_mark: YES |            ❌ NO             |          ❌ NO           | Historical versioning is append-only.           |
| **Audit Event Recording**                  | :white_check_mark: YES |            ❌ NO             |          ❌ NO           | Compliance & governance.                        |
| **SDK API Key Scoping**                    | :white_check_mark: YES | :white_check_mark: Validates |         ❌ Holds         | Keys are issued by Control and checked by Data. |
| **Snapshot Distribution (/sdk/v1/config)** |         ❌ NO          |    :white_check_mark: YES    |          ❌ NO           | Read-only high-throughput delivery.             |
| **ETag / 304 Conditional Caching**         |         ❌ NO          |    :white_check_mark: YES    | :white_check_mark: Sends | Eliminates redundant bandwidth.                 |
| **Runtime Flag Evaluation (`isEnabled`)**  |         ❌ NO          |            ❌ NO             |  :white_check_mark: YES  | In-memory local execution (<0.1ms).             |
| **Deterministic Hashing & Bucketing**      |         ❌ NO          |            ❌ NO             |  :white_check_mark: YES  | Computed client-side with zero network calls.   |
| **Offline Cache & Last Known Good**        |         ❌ NO          |            ❌ NO             |  :white_check_mark: YES  | Preserves operation during server outages.      |
| **Safe Default Fallbacks**                 |         ❌ NO          |            ❌ NO             |  :white_check_mark: YES  | Prevents host application crashes.              |

---

## 3. Plane-by-Plane Architectural Specifications

### 3.1. Control Plane (Management Plane)

- **Primary Package / Service:** `apps/control-api` and `apps/dashboard`.
- **API Prefix:** `/api/v1/...`
- **Authentication:** User JWT / Session tokens with RBAC (Owner, Admin, Developer, Viewer).
- **Core Entities Managed:**
  - `Organization`: Multi-tenant root.
  - `Project`: Scoped software application (e.g. `mobile-app`).
  - `Environment`: Independent deployment tier (`development`, `staging`, `production`).
  - `FeatureFlag`: Remotely managed toggle with typed defaults (Boolean, String, Number, JSON).
  - `TargetingRule`: Attribute conditions evaluated by priority.
  - `Rollout`: Percentage rollout ($0\%$ to $100\%$) with salt.
  - `ConfigurationVersion`: Immutable snapshot history ($v_1, v_2, \dots$).
  - `AuditEvent`: Append-only audit history with before/after state diffs.
  - `APIKey`: Scoped credentials for SDK distribution.
- **Transactional Boundary**: Any configuration mutation executes within an atomic database transaction that generates the normalized snapshot, computes its SHA-256 checksum, creates a new immutable version ($v_{n+1}$), and writes an audit log.

### 3.2. Data Plane (Distribution Plane)

- **Primary Service:** `apps/distribution-api`.
- **API Prefix:** `/sdk/v1/...`
- **Authentication:** Scoped SDK API Key (Read-Only).
- **Core Endpoints:**
  - `GET /sdk/v1/config`: Returns latest configuration snapshot with `ETag` and `Cache-Control` headers.
  - `HEAD /sdk/v1/config`: Returns metadata and `ETag` for version checking.
- **Conditional Request Flow:**
  1. SDK sends `If-None-Match: "<current-checksum-etag>"`.
  2. If version is unchanged $\implies$ Server responds with `304 Not Modified` (0 bytes payload).
  3. If version changed $\implies$ Server responds with `200 OK` and new JSON snapshot.
- **Architectural Isolation:** The Data Plane does not connect to user auth systems, does not evaluate targeting rules, and cannot perform mutations.

### 3.3. SDK Layer (Local Evaluation Plane)

- **Primary Packages:** `sdks/javascript`, `sdks/node`, `sdks/flutter`.
- **Core Packages Used:** `@controlplane/evaluation-engine`, `@controlplane/hashing`, `@controlplane/rule-engine`, `@controlplane/rollout-engine`, `@controlplane/config-client`.
- **Key Responsibilities:**
  1. **Initialization:** Loads cached Last Known Good configuration from disk/storage, activates it immediately, and initiates background remote sync.
  2. **Atomic Swap:** When new configuration arrives from Data Plane, validates schema and checksum before atomically replacing the active in-memory snapshot.
  3. **Local In-Memory Evaluation:**
     - `isEnabled(flagKey, context, defaultValue)`
     - `getString(flagKey, context, defaultValue)`
     - `getNumber(flagKey, context, defaultValue)`
     - `getJson(flagKey, context, defaultValue)`
  4. **Resilience Invariants:**
     - Network down $\implies$ evaluates using Last Known Good cache.
     - Cache corrupted $\implies$ returns safe default without crashing.
     - Unknown flag $\implies$ returns safe default.

---

## 4. Architectural Decision Records (ADRs)

- **[ADR-001: Separation of Control Plane and Data Plane](file:///d:/CP/docs/decisions/ADR-001-control-plane-vs-data-plane.md)**
- **[ADR-002: Why Local SDK Evaluation](file:///d:/CP/docs/decisions/ADR-002-why-local-evaluation.md)**

---

## 5. Architectural Quality Attributes & Non-Functional Requirements

1. **Availability**: Data Plane outage has **zero impact** on active running applications. SDKs evaluate from local cache.
2. **Latency**: In-memory local flag evaluation executes in $< 0.1\text{ ms}$ with no network I/O.
3. **Consistency**: Same configuration + same evaluation context produces 100% identical results across Dart/Flutter, JavaScript, and Node runtimes.
4. **Security**: SDK keys cannot modify configuration or view audit logs; tenant isolation is enforced at query boundaries.
