# Security Policy — CONTROLPLANE

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The CONTROLPLANE security team takes all vulnerabilities seriously.

1. **Do not create public GitHub issues** for suspected security vulnerabilities.
2. Email security disclosures directly to `security@controlplane.internal` or through your configured private reporting channel.
3. Include:
   - Type of issue (e.g. cross-tenant data leakage, unauthorized configuration manipulation, hashing bypass)
   - Step-by-step reproduction instructions or proof-of-concept payload
   - Affected packages or components (`apps/control-api`, `apps/distribution-api`, `sdks/*`, etc.)
4. The team will acknowledge receipt within 24 hours and provide an remediation timeline.

## Security Baseline Principles

- Strict multi-tenant isolation: Tenant boundaries are enforced at the database query and service layers.
- SDK keys are strictly scoped to specific environments (read-only for configuration distribution).
- Secrets and tokens are never written to logs, error payloads, or client bundles.
