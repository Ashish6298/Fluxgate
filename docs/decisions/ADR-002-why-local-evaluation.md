# ADR-002: Why Local SDK Evaluation

## Context

Feature flagging can be implemented via either:

1. **Server-Side Evaluation**: The application calls an HTTP endpoint every time a flag is evaluated (`GET /eval?flag=checkout&user=123`).
2. **Local SDK Evaluation**: The SDK downloads the configuration snapshot and evaluates targeting rules and percentage rollouts locally in-memory.

Server-side evaluation introduces network latency (50–300ms) to critical execution paths, fails completely when the client is offline, and places quadratic scaling load on distribution servers.

## Decision

All CONTROLPLANE SDKs (Flutter, JavaScript, Node) will evaluate feature flags **100% locally in-memory**.

- The SDK downloads and caches the full configuration snapshot for its scoped environment.
- Any call to `isEnabled()`, `getString()`, `getNumber()`, or `getJson()` performs pure in-memory calculation with zero network overhead.
- Hashing and rule evaluation are computed deterministically on the client device or server runtime.

## Consequences

### Positive

- Sub-millisecond evaluation latency (< 0.1ms).
- Complete offline capability: applications function normally without network access using cached configurations.
- Massive infrastructure cost reduction: distribution servers only handle infrequent snapshot polling, not per-user evaluation requests.

### Negative

- Configuration payloads are sent to SDKs (sensitive values must not be stored in flag targeting rules without consideration).
- Requires exact cross-platform parity across SDK evaluation engines (enforced through shared golden test vectors).
