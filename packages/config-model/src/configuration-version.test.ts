import { describe, it, expect, beforeEach } from 'vitest';
import {
  createConfigurationVersion,
  computeSnapshotChecksum,
  InMemoryConfigurationVersionRepository,
} from './index.js';

describe('ConfigurationVersion Domain Model & Repository (Phase 1.7)', () => {
  const validEnvId = '123e4567-e89b-12d3-a456-426614174000';
  const validEnvId2 = '223e4567-e89b-12d3-a456-426614174000';

  const sampleSnapshot = {
    schemaVersion: 1,
    projectKey: 'mobile-app',
    environmentKey: 'production',
    configurationVersion: 1,
    checksum: 'mock-checksum',
    flags: [],
  };

  describe('createConfigurationVersion', () => {
    it('creates an immutable ConfigurationVersion domain model', () => {
      const checksum = computeSnapshotChecksum(sampleSnapshot);
      const version = createConfigurationVersion({
        environmentId: validEnvId,
        version: 1,
        snapshot: sampleSnapshot,
        checksum,
        createdBy: 'developer_123',
        reason: 'Initial configuration snapshot',
      });

      expect(version.id).toBeDefined();
      expect(version.environmentId).toBe(validEnvId);
      expect(version.version).toBe(1);
      expect(version.snapshot).toEqual(sampleSnapshot);
      expect(version.checksum).toBe(checksum);
      expect(version.createdBy).toBe('developer_123');
      expect(version.reason).toBe('Initial configuration snapshot');
      expect(version.createdAt).toBeDefined();

      // Verify runtime immutability (Object.freeze)
      expect(Object.isFrozen(version)).toBe(true);
      expect(() => {
        (version as unknown as { reason: string }).reason = 'Hacked';
      }).toThrow();
    });

    it('applies default reason when omitted', () => {
      const checksum = computeSnapshotChecksum(sampleSnapshot);
      const version = createConfigurationVersion({
        environmentId: validEnvId,
        version: 1,
        snapshot: sampleSnapshot,
        checksum,
        createdBy: 'developer_123',
      });

      expect(version.reason).toBe('Configuration update');
    });

    it('throws when version is invalid (e.g. 0 or negative)', () => {
      const checksum = computeSnapshotChecksum(sampleSnapshot);
      expect(() =>
        createConfigurationVersion({
          environmentId: validEnvId,
          version: 0,
          snapshot: sampleSnapshot,
          checksum,
          createdBy: 'developer_123',
        }),
      ).toThrow();
    });
  });

  describe('computeSnapshotChecksum', () => {
    it('computes deterministic SHA-256 checksums regardless of key insertion order', () => {
      const snapshot1 = { a: 1, b: 'test', c: true };
      const snapshot2 = { c: true, b: 'test', a: 1 };

      const cs1 = computeSnapshotChecksum(snapshot1);
      const cs2 = computeSnapshotChecksum(snapshot2);

      expect(cs1).toBe(cs2);
      expect(cs1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('InMemoryConfigurationVersionRepository', () => {
    let repo: InMemoryConfigurationVersionRepository;

    beforeEach(() => {
      repo = new InMemoryConfigurationVersionRepository();
    });

    it('creates and finds versions', async () => {
      const checksum = computeSnapshotChecksum(sampleSnapshot);
      const v1 = await repo.create({
        environmentId: validEnvId,
        version: 1,
        snapshot: sampleSnapshot,
        checksum,
        createdBy: 'dev_1',
        reason: 'Version 1',
      });

      const foundById = await repo.findById(v1.id);
      expect(foundById).toEqual(v1);

      const foundByVersion = await repo.findByVersion(validEnvId, 1);
      expect(foundByVersion).toEqual(v1);
    });

    it('enforces immutability by rejecting duplicate version creation in the same environment', async () => {
      const checksum = computeSnapshotChecksum(sampleSnapshot);
      await repo.create({
        environmentId: validEnvId,
        version: 1,
        snapshot: sampleSnapshot,
        checksum,
        createdBy: 'dev_1',
      });

      await expect(
        repo.create({
          environmentId: validEnvId,
          version: 1,
          snapshot: sampleSnapshot,
          checksum,
          createdBy: 'dev_2',
        }),
      ).rejects.toThrow(/already exists and is IMMUTABLE/);
    });

    it('allows same version numbers across different environments', async () => {
      const checksum = computeSnapshotChecksum(sampleSnapshot);
      const v1Env1 = await repo.create({
        environmentId: validEnvId,
        version: 1,
        snapshot: sampleSnapshot,
        checksum,
        createdBy: 'dev_1',
      });

      const v1Env2 = await repo.create({
        environmentId: validEnvId2,
        version: 1,
        snapshot: sampleSnapshot,
        checksum,
        createdBy: 'dev_2',
      });

      expect(v1Env1.id).not.toBe(v1Env2.id);
      expect(await repo.findByVersion(validEnvId, 1)).toEqual(v1Env1);
      expect(await repo.findByVersion(validEnvId2, 1)).toEqual(v1Env2);
    });

    it('tracks sequential version history and provides getLatest()', async () => {
      const checksum1 = computeSnapshotChecksum({ ...sampleSnapshot, configurationVersion: 1 });
      const checksum2 = computeSnapshotChecksum({ ...sampleSnapshot, configurationVersion: 2 });
      const checksum3 = computeSnapshotChecksum({ ...sampleSnapshot, configurationVersion: 3 });

      await repo.create({
        environmentId: validEnvId,
        version: 1,
        snapshot: { ...sampleSnapshot, configurationVersion: 1 },
        checksum: checksum1,
        createdBy: 'dev_1',
        reason: 'Initial flag',
      });

      await repo.create({
        environmentId: validEnvId,
        version: 2,
        snapshot: { ...sampleSnapshot, configurationVersion: 2 },
        checksum: checksum2,
        createdBy: 'dev_2',
        reason: 'Add rollout rule',
      });

      const v3 = await repo.create({
        environmentId: validEnvId,
        version: 3,
        snapshot: { ...sampleSnapshot, configurationVersion: 3 },
        checksum: checksum3,
        createdBy: 'dev_3',
        reason: 'Enable flag',
      });

      const latest = await repo.getLatest(validEnvId);
      expect(latest?.version).toBe(3);
      expect(latest?.id).toBe(v3.id);

      const history = await repo.listByEnvironment(validEnvId);
      expect(history.map((h) => h.version)).toEqual([1, 2, 3]);
    });

    it('returns null for getLatest on empty environment', async () => {
      expect(await repo.getLatest(validEnvId)).toBeNull();
    });
  });
});
