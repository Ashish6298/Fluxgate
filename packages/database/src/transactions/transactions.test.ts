import type { FeatureFlag } from '@controlplane/contracts';
import { describe, expect, it } from 'vitest';
import { type AtomicFlagUpdateParams, TransactionManager } from './transaction-manager.js';

describe('Transaction Boundaries & Atomic Unit of Work (Phase 2.4)', () => {
  const manager = new TransactionManager();

  const mockFlag: FeatureFlag = {
    id: 'f1111111-1111-1111-1111-111111111111',
    environmentId: 'e1111111-1111-1111-1111-111111111111',
    key: 'dark_mode',
    name: 'Dark Mode',
    type: 'BOOLEAN',
    defaultValue: false,
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const sampleParams: AtomicFlagUpdateParams = {
    organizationId: 'o1111111-1111-1111-1111-111111111111',
    projectKey: 'mobile-app',
    environmentKey: 'production',
    actorId: 'usr_admin',
    reason: 'Enable dark mode by default',
    flag: { ...mockFlag, defaultValue: true },
    targetingRules: [],
    allEnvironmentFlags: [mockFlag],
    allEnvironmentRules: [],
    allEnvironmentRollouts: [],
    currentVersionNumber: 3,
  };

  it('should atomically execute flag update + snapshot + version + audit event on success', async () => {
    const result = await manager.executeAtomicFlagUpdate(sampleParams);

    // 1. Updated Flag
    expect(result.updatedFlag.id).toBe(mockFlag.id);
    expect(result.updatedFlag.defaultValue).toBe(true);
    expect(new Date(result.updatedFlag.updatedAt).getTime()).toBeGreaterThan(
      new Date(mockFlag.createdAt).getTime(),
    );

    // 2. Snapshot
    expect(result.snapshot.configurationVersion).toBe(4);
    expect(result.snapshot.flags).toHaveLength(1);
    expect(result.snapshot.flags[0]?.defaultValue).toBe(true);

    // 3. Configuration Version
    expect(result.configurationVersion.version).toBe(4);
    expect(result.configurationVersion.checksum).toBeTypeOf('string');
    expect(result.configurationVersion.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.configurationVersion.createdBy).toBe('usr_admin');

    // 4. Audit Event
    expect(result.auditEvent.action).toBe('FEATURE_FLAG_UPDATED');
    expect(result.auditEvent.resourceId).toBe(mockFlag.id);
    expect(result.auditEvent.organizationId).toBe(sampleParams.organizationId);
    expect(result.auditEvent.actorId).toBe('usr_admin');
  });

  it('should completely roll back and throw if step 1 (Update Flag) fails', async () => {
    await expect(manager.executeAtomicFlagUpdate(sampleParams, 'UPDATE_FLAG')).rejects.toThrow(
      'Simulated failure during Step 1: Update Flag',
    );
  });

  it('should completely roll back and throw if step 2 (Generate Snapshot) fails', async () => {
    await expect(
      manager.executeAtomicFlagUpdate(sampleParams, 'GENERATE_SNAPSHOT'),
    ).rejects.toThrow('Simulated failure during Step 2: Generate Snapshot');
  });

  it('should completely roll back and throw if step 3 (Create Version) fails', async () => {
    await expect(manager.executeAtomicFlagUpdate(sampleParams, 'CREATE_VERSION')).rejects.toThrow(
      'Simulated failure during Step 3: Create Version',
    );
  });

  it('should completely roll back and throw if step 4 (Create Audit Event) fails', async () => {
    await expect(
      manager.executeAtomicFlagUpdate(sampleParams, 'CREATE_AUDIT_EVENT'),
    ).rejects.toThrow('Simulated failure during Step 4: Create Audit Event');
  });
});
