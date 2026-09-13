import { describe, it, expect } from 'vitest';
import {
  FlagTypeSchema,
  EvaluationReasonSchema,
  EvaluationContextSchema,
} from '@controlplane/contracts';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PHASE 0.1 — Product Definition Verification', () => {
  const docPath = resolve(__dirname, '../../../docs/architecture/product-definition.md');

  it('should verify product definition specification document exists and is comprehensive', () => {
    expect(existsSync(docPath)).toBe(true);
    const content = readFileSync(docPath, 'utf8');

    // Required sections
    expect(content).toContain('CONTROLPLANE — Complete Product Definition Specification');
    expect(content).toContain('Core Product Statement');
    expect(content).toContain('Target Users');
    expect(content).toContain('The Core Problem');
    expect(content).toContain('Important Boundaries & Limitations');
    expect(content).toContain('v1.0.0 Scope');
    expect(content).toContain('Non-Goals for v1.0.0');
    expect(content).toContain('Architecture Philosophy');
    expect(content).toContain('Core Terminology & Glossary');

    // Core Invariants
    expect(content).toContain('Should this feature execute');
    expect(content).toContain(
      'Core correctness → deterministic behavior → reliability → SDKs → distribution → security → dashboard → release',
    );
  });

  it('should verify contract schemas align with defined product terminology', () => {
    // 4 supported flag types
    expect(FlagTypeSchema.options).toEqual(['BOOLEAN', 'STRING', 'NUMBER', 'JSON']);

    // Evaluation reasons
    expect(EvaluationReasonSchema.options).toEqual([
      'DEFAULT',
      'FLAG_DISABLED',
      'TARGETING_RULE',
      'PERCENTAGE_ROLLOUT',
      'ROLLOUT_EXCLUDED',
      'UNKNOWN_FLAG',
      'ERROR',
    ]);

    // Evaluation context accepts standard properties
    const validContext = {
      userId: 'usr_abc',
      anonymousId: 'anon_123',
      platform: 'flutter',
      appVersion: '1.2.0',
      country: 'US',
      language: 'en',
      customAttributes: {
        isBetaTester: true,
        score: 95,
        plan: 'enterprise',
      },
    };
    expect(EvaluationContextSchema.safeParse(validContext).success).toBe(true);
  });
});
