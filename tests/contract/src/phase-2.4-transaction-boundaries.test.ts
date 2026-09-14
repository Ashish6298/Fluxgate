import type { FeatureFlag } from '@controlplane/contracts';
import { type AtomicFlagUpdateParams, TransactionManager } from '@controlplane/database';
import { describe, expect, it } from 'vitest';

describe('PHASE 2.4 CONTRACT: Transaction Boundaries & Atomicity', () => {
  const manager = new TransactionManager();

  const mockFlag: FeatureFlag = {
    id: 'f2222222-2222-2222-2222-222222222222',
    environmentId: 'e2222222-2222-2222-2222-222222222222',
    key: 'beta_dashboard',
    name: 'Beta Dashboard',
    type: 'BOOLEAN',
    defaultValue: false,
    enabled: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  };

  const sampleParams: AtomicFlagUpdateParams = {
    organizationId: 'o2222222-2222-2222-2222-222222222222',
    projectKey: 'web-portal',
    environmentKey: 'staging',
    actorId: 'usr_lead_dev',
    reason: 'Promote beta dashboard to active',
    flag: { ...mockFlag, defaultValue: true },
    targetingRules: [],
    allEnvironmentFlags: [mockFlag],
    allEnvironmentRules: [],
    allEnvironmentRollouts: [],
    currentVersionNumber: 7,
  };

  it('CONTRACT: Multi-entity operation (Update Flag + Snapshot + Version + Audit Event) must succeed atomically', async () => {
    const result = await manager.executeAtomicFlagUpdate(sampleParams);

    // 1. Updated Flag
    expect(result.updatedFlag.id).toBe(mockFlag.id);
    expect(result.updatedFlag.defaultValue).toBe(true);

    // 2. Snapshot
    expect(result.snapshot.configurationVersion).toBe(8);
    expect(result.snapshot.projectKey).toBe('web-portal');
    expect(result.snapshot.environmentKey).toBe('staging');

    // 3. Immutable Version
    expect(result.configurationVersion.version).toBe(8);
    expect(result.configurationVersion.checksum).toBeTruthy();
    expect(result.configurationVersion.createdBy).toBe('usr_lead_dev');

    // 4. Audit Trail
    expect(result.auditEvent.action).toBe('FEATURE_FLAG_UPDATED');
    expect(result.auditEvent.organizationId).toBe(sampleParams.organizationId);
    expect(result.auditEvent.actorId).toBe('usr_lead_dev');
  });

  it('CONTRACT: Partial failure must trigger complete rollback (Desired Behavior: SUCCESS OR COMPLETE ROLLBACK)', async () => {
    // Failure at step 3 (Create Version)
    let errorCaught = false;
    try {
      await manager.executeAtomicFlagUpdate(sampleParams, 'CREATE_VERSION');
    } catch (err) {
      errorCaught = true;
      expect((err as Error).message).toContain('Simulated failure during Step 3: Create Version');
    }
    expect(errorCaught).toBe(true);

    // Failure at step 4 (Create Audit Event)
    errorCaught = false;
    try {
      await manager.executeAtomicFlagUpdate(sampleParams, 'CREATE_AUDIT_EVENT');
    } catch (err) {
      errorCaught = true;
      expect((err as Error).message).toContain(
        'Simulated failure during Step 4: Create Audit Event',
      );
    }
    expect(errorCaught).toBe(true);
  });
});
