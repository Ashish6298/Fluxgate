# Development Toolchain & Environment Guide

## 1. Environment Requirements

- **Node.js**: `>= 20.0.0` (LTS recommended)
- **Package Manager**: `pnpm >= 9.0.0`
- **TypeScript**: `5.x`

---

## 2. Standard Reproducible Workflow

A fresh repository clone must be able to install, compile, and execute tests without manual intervention:

```text
git clone https://github.com/Ashish6298/Fluxgate.git
cd Fluxgate
pnpm install
pnpm run build
pnpm test
```

---

## 3. Required Commands Reference

| Command                       | Lifecycle Purpose                                                     | Scope                            |
| :---------------------------- | :-------------------------------------------------------------------- | :------------------------------- |
| `pnpm install`                | Installs dependencies and links internal monorepo packages.           | Monorepo Root                    |
| `pnpm run build`              | Compiles TypeScript across all workspace packages, apps, and SDKs.    | `packages/*`, `apps/*`, `sdks/*` |
| `pnpm test`                   | Executes the complete Vitest test suite across all packages.          | Entire Monorepo                  |
| `pnpm run test:unit`          | Executes unit tests for pure core logic packages and SDKs.            | `packages/*`, `sdks/*`           |
| `pnpm run test:integration`   | Executes end-to-end local evaluation integration tests.               | `tests/integration`              |
| `pnpm run test:contract`      | Executes contract and golden vector test suites.                      | `tests/contract`                 |
| `pnpm run test:compatibility` | Executes cross-SDK hashing equivalence tests.                         | `tests/compatibility`            |
| `pnpm run test:load`          | Executes local evaluation throughput performance benchmarks.          | `tests/load`                     |
| `pnpm run lint`               | Runs ESLint (flat config) to detect anti-patterns and unused code.    | Monorepo Root                    |
| `pnpm run lint:fix`           | Automatically fixes auto-fixable lint issues.                         | Monorepo Root                    |
| `pnpm run format`             | Formats all code, docs, and JSON files using Prettier.                | Monorepo Root                    |
| `pnpm run format:check`       | Verifies formatting compliance without mutating files.                | Monorepo Root                    |
| `pnpm run typecheck`          | Runs strict TypeScript typechecking (`tsc --noEmit`) on all packages. | All Workspace Projects           |
| `pnpm run clean`              | Removes all `dist/` compilation artifacts.                            | `packages/*`, `apps/*`, `sdks/*` |

---

## 4. Engineering Standards & Tool Configurations

### TypeScript Configuration (`tsconfig.base.json`)

- Strict type checking enabled (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`).
- NodeNext module resolution with ES2022 target.
- Project references enabled for fast incremental compilation.

### ESLint Configuration (`eslint.config.mjs`)

- Flat configuration format (`eslint.config.mjs`).
- TypeScript ESLint recommended rules with unused variable detection.
- `any` types restricted in domain and evaluation engines.

### Prettier Configuration (`.prettierrc`)

- Single quotes, trailing commas (`all`), 2-space indentation, 100 character print width.

### Vitest Test Configuration (`vitest.config.ts`)

- Project-based workspace testing (`projects: ['packages/*', 'apps/*', 'sdks/*', 'tests/*']`).
- Node execution environment with v8 code coverage reporting.
