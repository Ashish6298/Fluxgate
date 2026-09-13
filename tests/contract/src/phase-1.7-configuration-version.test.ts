import { describe, it, expect } from 'vitest';
import {
  ConfigurationVersionSchema,
  createConfigurationVersion,
  computeSnapshotChecksum,
  InMemoryConfigurationVersionRepository,
} from '@controlplane/config-model';

describe('PHASE 1.7 — Configuration Version Contract & Specification Conformance', () => {
  const dummyEnvId = 'f1e2d3c4-b5a6-7890-1234-56789abcdef0';

  const mockSnapshotV41 = {
    schemaVersion: 1,
    projectKey: 'mobile-app',
    environmentKey: 'production',
    configurationVersion: 41,
    flags: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        environmentId: dummyEnvId,
        key: 'new_checkout',
        name: 'New Checkout Flow',
        type: 'BOOLEAN',
        defaultValue: false,
        enabled: true,
        rules: [],
        rollout: {
          id: '22222222-2222-4222-8222-222222222222',
          featureFlagId: '11111111-1111-4111-8111-111111111111',
          percentage: 10,
          salt: 'v1',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  it('adheres to Phase 1.7 ConfigurationVersion model specification', () => {
    const checksum = computeSnapshotChecksum(mockSnapshotV41);
    const versionRecord = createConfigurationVersion({
      environmentId: dummyEnvId,
      version: 41,
      snapshot: mockSnapshotV41,
      checksum,
      createdBy: 'developer_123',
      reason: 'Rollout 10% on new_checkout',
    });

    // Verify presence of all required fields from phase.txt
    expect(versionRecord).toHaveProperty('id');
    expect(versionRecord).toHaveProperty('environmentId', dummyEnvId);
    expect(versionRecord).toHaveProperty('version', 41);
    expect(versionRecord).toHaveProperty('snapshot', mockSnapshotV41);
    expect(versionRecord).toHaveProperty('checksum', checksum);
    expect(versionRecord).toHaveProperty('createdBy', 'developer_123');
    expect(versionRecord).toHaveProperty('reason', 'Rollout 10% on new_checkout');
    expect(versionRecord).toHaveProperty('createdAt');

    const validated = ConfigurationVersionSchema.safeParse(versionRecord);
    expect(validated.success).toBe(true);
  });

  it('enforces strict IMMUTABILITY rule: history is append-only and cannot be mutated', async () => {
    const repo = new InMemoryConfigurationVersionRepository();
    const checksum41 = computeSnapshotChecksum(mockSnapshotV41);

    const v41 = await repo.create({
      environmentId: dummyEnvId,
      version: 41,
      snapshot: mockSnapshotV41,
      checksum: checksum41,
      createdBy: 'developer_123',
      reason: 'Rollout 10%',
    });

    // 1. Runtime immutability check
    expect(Object.isFrozen(v41)).toBe(true);
    expect(() => {
      (v41 as unknown as { reason: string }).reason = 'Tampered reason';
    }).toThrow();

    // 2. Repository immutability check (cannot overwrite version 41)
    await expect(
      repo.create({
        environmentId: dummyEnvId,
        version: 41,
        snapshot: mockSnapshotV41,
        checksum: checksum41,
        createdBy: 'malicious_actor',
        reason: 'Overwrite attempt',
      }),
    ).rejects.toThrow(/already exists and is IMMUTABLE/);
  });

  it('demonstrates correct rollback semantics: creates new version v44 restoring v41 snapshot', async () => {
    const repo = new InMemoryConfigurationVersionRepository();

    const snapshotV42 = { ...mockSnapshotV41, configurationVersion: 42 };
    const snapshotV43 = { ...mockSnapshotV41, configurationVersion: 43 };

    // v41: 10% rollout
    await repo.create({
      environmentId: dummyEnvId,
      version: 41,
      snapshot: mockSnapshotV41,
      checksum: computeSnapshotChecksum(mockSnapshotV41),
      createdBy: 'dev_1',
      reason: '10% rollout',
    });

    // v42: 25% rollout
    await repo.create({
      environmentId: dummyEnvId,
      version: 42,
      snapshot: snapshotV42,
      checksum: computeSnapshotChecksum(snapshotV42),
      createdBy: 'dev_2',
      reason: 'Increase rollout to 25%',
    });

    // v43: 50% rollout (bug discovered!)
    await repo.create({
      environmentId: dummyEnvId,
      version: 43,
      snapshot: snapshotV43,
      checksum: computeSnapshotChecksum(snapshotV43),
      createdBy: 'dev_2',
      reason: 'Increase rollout to 50%',
    });

    // Rollback requirement: DO NOT overwrite history. Create v44 containing snapshot from v41!
    const targetRollbackVersion = await repo.findByVersion(dummyEnvId, 41);
    expect(targetRollbackVersion).not.toBeNull();

    const latest = await repo.getLatest(dummyEnvId);
    expect(latest?.version).toBe(43);

    const newVersionNumber = (latest?.version ?? 0) + 1; // 44
    const restoredSnapshot = {
      ...targetRollbackVersion!.snapshot,
      configurationVersion: newVersionNumber,
    };

    const v44 = await repo.create({
      environmentId: dummyEnvId,
      version: newVersionNumber,
      snapshot: restoredSnapshot,
      checksum: computeSnapshotChecksum(restoredSnapshot),
      createdBy: 'incident_responder',
      reason: 'Rollback to configuration from version 41',
    });

    expect(v44.version).toBe(44);
    expect(v44.reason).toBe('Rollback to configuration from version 41');

    // Complete audit trail is preserved: [41, 42, 43, 44]
    const history = await repo.listByEnvironment(dummyEnvId);
    expect(history.map((h) => h.version)).toEqual([41, 42, 43, 44]);
  });
});
