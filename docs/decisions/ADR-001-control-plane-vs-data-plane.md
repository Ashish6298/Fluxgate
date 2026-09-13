# ADR-001: Separation of Control Plane and Data Plane

## Context

A feature management platform serves two radically different operational workloads:

1. **Management Operations**: Infrequent, transactional, highly relational, security-critical authoring of configurations and role management.
2. **Distribution Operations**: High-frequency, read-intensive, latency-sensitive serving of configuration snapshots to thousands or millions of client SDK instances.

Coupling these workloads into a monolithic service risks outage cascading: management spikes or dashboard failures could disrupt configuration distribution to client SDKs.

## Decision

We strictly decouple the architecture into:

- **Control Plane (`apps/control-api`)**: Handles tenant management, authorization, mutations, transactions, versioning, and audit logging.
- **Data Plane (`apps/distribution-api`)**: Handles read-only snapshot retrieval, SDK authentication, and conditional HTTP caching (`ETag` / `304`).

## Consequences

### Positive

- Independent scaling: Data Plane can scale horizontally without load on the transactional management layer.
- Blast radius isolation: A disruption in the Control API or Dashboard does not stop SDKs from pulling configuration.
- Simplified security posture: SDK credentials only grant read access to the Distribution API, preventing management compromise.

### Negative

- Requires maintaining two API service interfaces and distinct deployment targets.
