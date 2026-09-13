# Contributing to CONTROLPLANE

Thank you for contributing to CONTROLPLANE. Please read and follow these engineering guidelines.

## Development Philosophy

CONTROLPLANE is mission-critical developer infrastructure. Development strictly adheres to this principle:

> **Core correctness → deterministic behavior → reliability → SDKs → distribution → security → dashboard → release**

### Non-Negotiable Invariants

1. **Deterministic Evaluation**: Same configuration + same evaluation context must yield identical results across all SDKs (Dart, JS, Node).
2. **Local Evaluation**: Feature evaluation must never make runtime network calls.
3. **Immutable History**: Configuration versions are append-only. History is never overwritten.
4. **Resilient Failure Modes**: Network or cache failures must gracefully degrade to Last Known Good configurations or safe defaults without crashing.

## Monorepo Workflow

We use `pnpm` workspaces.

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Build all packages
pnpm build

# 3. Run typecheck across all workspaces
pnpm typecheck

# 4. Run test suites
pnpm test

# 5. Format & Lint
pnpm format:check
pnpm lint
```

## Pull Request Checklist

- [ ] Code adheres to TypeScript strict mode with no implicit `any`.
- [ ] Automated tests cover new logic and failure scenarios.
- [ ] Cross-SDK compatibility is preserved for any evaluation or hashing changes.
- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass cleanly.
