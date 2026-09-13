# Continuous Integration (CI) Architecture & Quality Gates

## 1. Objective

Ensure broken code, failing tests, type errors, lint regressions, or format violations cannot silently enter the repository.

---

## 2. CI Pipeline Order & Quality Gates

Every pull request and push to protected branches executes the deterministic 6-step pipeline:

```mermaid
graph TD
    PR[Pull Request / Push] --> Step1[Step 1: Clean Install (pnpm install --frozen-lockfile)]
    Step1 --> Step2[Step 2: Format Check (prettier --check .)]
    Step2 --> Step3[Step 3: Lint (eslint .)]
    Step3 --> Step4[Step 4: Type Check (tsc --noEmit)]
    Step4 --> Step5[Step 5: Test Harness (vitest run)]
    Step5 --> Step6[Step 6: Monorepo Build (pnpm run build)]
    Step6 --> Success[Green Check / Merge Allowed]

    Step2 -.->|Format Error| Fail[CI FAILED / Block Merge]
    Step3 -.->|Lint Error| Fail
    Step4 -.->|Type Error| Fail
    Step5 -.->|Test Failure| Fail
    Step6 -.->|Build Error| Fail
```

---

## 3. Failure Behavior & Invariants

1. **Failing Tests Fail CI**: Any unit, contract, or integration test failure causes non-zero exit code (`1`) and aborts pipeline execution.
2. **Type Errors Fail CI**: TypeScript strict mode (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`) must pass with 0 errors.
3. **Lint Errors Fail CI**: ESLint checks prevent unused variables and unsafe `any` usages.
4. **Format Violations Fail CI**: `prettier --check` enforces uniform code style without manual code review debates.
5. **Frozen Lockfile**: Dependencies must match `pnpm-lock.yaml` exactly. Uncommitted dependency drift fails at Step 1.

---

## 4. Local CI Simulation Command

Developers can simulate the exact CI pipeline locally before submitting pull requests:

```bash
pnpm install && pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm test && pnpm run build
```
