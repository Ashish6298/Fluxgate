import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getControlApiInfo } from '@controlplane/control-api';
import { getDistributionApiInfo } from '@controlplane/distribution-api';
import { ControlPlane } from '@controlplane/sdk';

describe('PHASE 0.2 — Control Plane vs Data Plane Architecture Verification', () => {
  const archDocPath = resolve(__dirname, '../../../docs/architecture/control-vs-data-plane.md');
  const adr001Path = resolve(
    __dirname,
    '../../../docs/decisions/ADR-001-control-plane-vs-data-plane.md',
  );
  const adr002Path = resolve(__dirname, '../../../docs/decisions/ADR-002-why-local-evaluation.md');

  it('should verify architecture documents and ADRs exist and contain required invariants', () => {
    expect(existsSync(archDocPath)).toBe(true);
    expect(existsSync(adr001Path)).toBe(true);
    expect(existsSync(adr002Path)).toBe(true);

    const archDoc = readFileSync(archDocPath, 'utf8');
    expect(archDoc).toContain('1. CONTROL PLANE');
    expect(archDoc).toContain('2. DATA PLANE');
    expect(archDoc).toContain('3. SDK LAYER');
    expect(archDoc).toContain('Non-Overlapping Boundary Matrix');
    expect(archDoc.toUpperCase()).toContain('LOCAL EVALUATION');

    const adr1 = readFileSync(adr001Path, 'utf8');
    expect(adr1).toContain('ADR-001');
    expect(adr1).toContain('Separation of Control Plane and Data Plane');

    const adr2 = readFileSync(adr002Path, 'utf8');
    expect(adr2).toContain('ADR-002');
    expect(adr2).toContain('Why Local SDK Evaluation');
  });

  it('should verify Control API and Distribution API service boundaries are non-overlapping', () => {
    const controlInfo = getControlApiInfo();
    expect(controlInfo.name).toBe('controlplane-control-api');
    expect(controlInfo).not.toHaveProperty('supportsETag'); // Control API is not for SDK ETag distribution

    const distInfo = getDistributionApiInfo();
    expect(distInfo.name).toBe('controlplane-distribution-api');
    expect(distInfo.supportsETag).toBe(true); // Data plane provides ETag distribution
  });

  it('should verify SDK performs local evaluation without server evaluation dependency', async () => {
    const sdk = await ControlPlane.initialize({
      apiKey: 'sdk_key_prod',
      initialSnapshot: {
        schemaVersion: 1,
        projectKey: 'test-app',
        environmentKey: 'production',
        configurationVersion: 5,
        checksum: 'checksum_5',
        flags: [
          {
            id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
            environmentId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
            key: 'enable_checkout_v2',
            name: 'Enable Checkout V2',
            type: 'BOOLEAN',
            defaultValue: true,
            enabled: true,
            rules: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    });

    // Evaluation is 100% synchronous and in-memory
    const isEnabled = sdk.isEnabled('enable_checkout_v2');
    expect(isEnabled).toBe(true);

    const unknownFallback = sdk.isEnabled('non_existent', {}, false);
    expect(unknownFallback).toBe(false);
  });
});
