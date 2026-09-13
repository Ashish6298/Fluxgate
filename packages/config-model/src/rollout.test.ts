import { describe, it, expect, beforeEach } from 'vitest';
import { createRollout, updateRollout, InMemoryRolloutRepository, type Rollout } from './index.js';

describe('Rollout Domain Model & Repository (Phase 1.6)', () => {
  const validFeatureFlagId = '123e4567-e89b-12d3-a456-426614174000';
  const validFeatureFlagId2 = '223e4567-e89b-12d3-a456-426614174000';

  describe('createRollout', () => {
    it('creates a valid Rollout with default salt and enabled state', () => {
      const rollout = createRollout({
        featureFlagId: validFeatureFlagId,
        percentage: 25,
      });

      expect(rollout.id).toBeDefined();
      expect(rollout.featureFlagId).toBe(validFeatureFlagId);
      expect(rollout.percentage).toBe(25);
      expect(rollout.salt).toBe('v1');
      expect(rollout.enabled).toBe(true);
      expect(rollout.createdAt).toBeDefined();
      expect(rollout.updatedAt).toBeDefined();
    });

    it('creates a rollout with custom salt and explicit enabled state', () => {
      const customTime = '2026-09-13T20:00:00.000Z';
      const rollout = createRollout({
        featureFlagId: validFeatureFlagId,
        percentage: 50,
        salt: 'canary-v2',
        enabled: false,
        now: customTime,
      });

      expect(rollout.percentage).toBe(50);
      expect(rollout.salt).toBe('canary-v2');
      expect(rollout.enabled).toBe(false);
      expect(rollout.createdAt).toBe(customTime);
      expect(rollout.updatedAt).toBe(customTime);
    });

    it('throws when percentage is out of range', () => {
      expect(() =>
        createRollout({
          featureFlagId: validFeatureFlagId,
          percentage: -5,
        }),
      ).toThrow();

      expect(() =>
        createRollout({
          featureFlagId: validFeatureFlagId,
          percentage: 101,
        }),
      ).toThrow();
    });
  });

  describe('updateRollout', () => {
    let initialRollout: Rollout;

    beforeEach(() => {
      initialRollout = createRollout({
        featureFlagId: validFeatureFlagId,
        percentage: 25,
        salt: 'v1',
        enabled: true,
        now: '2026-09-13T10:00:00.000Z',
      });
    });

    it('updates percentage, salt, and enabled immutably', () => {
      const updated = updateRollout(
        initialRollout,
        {
          percentage: 50,
          salt: 'v2',
          enabled: false,
        },
        '2026-09-13T12:00:00.000Z',
      );

      expect(updated.id).toBe(initialRollout.id);
      expect(updated.featureFlagId).toBe(initialRollout.featureFlagId);
      expect(updated.percentage).toBe(50);
      expect(updated.salt).toBe('v2');
      expect(updated.enabled).toBe(false);
      expect(updated.createdAt).toBe('2026-09-13T10:00:00.000Z');
      expect(updated.updatedAt).toBe('2026-09-13T12:00:00.000Z');

      // Original remains untouched
      expect(initialRollout.percentage).toBe(25);
      expect(initialRollout.salt).toBe('v1');
      expect(initialRollout.enabled).toBe(true);
    });
  });

  describe('InMemoryRolloutRepository', () => {
    let repo: InMemoryRolloutRepository;

    beforeEach(() => {
      repo = new InMemoryRolloutRepository();
    });

    it('creates and finds a rollout by id and featureFlagId', async () => {
      const created = await repo.create({
        featureFlagId: validFeatureFlagId,
        percentage: 25,
      });

      expect(created.id).toBeDefined();

      const foundById = await repo.findById(created.id);
      expect(foundById).toEqual(created);

      const foundByFlag = await repo.findByFeatureFlagId(validFeatureFlagId);
      expect(foundByFlag).toEqual(created);
    });

    it('prevents duplicate rollout per featureFlagId', async () => {
      await repo.create({
        featureFlagId: validFeatureFlagId,
        percentage: 10,
      });

      await expect(
        repo.create({
          featureFlagId: validFeatureFlagId,
          percentage: 50,
        }),
      ).rejects.toThrow(/already exists/);
    });

    it('supports multiple rollouts for different feature flags', async () => {
      const r1 = await repo.create({
        featureFlagId: validFeatureFlagId,
        percentage: 10,
      });

      const r2 = await repo.create({
        featureFlagId: validFeatureFlagId2,
        percentage: 50,
      });

      expect(r1.id).not.toBe(r2.id);
      expect(await repo.findByFeatureFlagId(validFeatureFlagId)).toEqual(r1);
      expect(await repo.findByFeatureFlagId(validFeatureFlagId2)).toEqual(r2);
    });

    it('updates an existing rollout', async () => {
      const created = await repo.create({
        featureFlagId: validFeatureFlagId,
        percentage: 25,
      });

      const updated = await repo.update(created.id, {
        percentage: 75,
        enabled: true,
      });

      expect(updated.percentage).toBe(75);

      const found = await repo.findById(created.id);
      expect(found?.percentage).toBe(75);
    });

    it('deletes a rollout', async () => {
      const created = await repo.create({
        featureFlagId: validFeatureFlagId,
        percentage: 25,
      });

      const deleted = await repo.delete(created.id);
      expect(deleted).toBe(true);

      expect(await repo.findById(created.id)).toBeNull();
      expect(await repo.findByFeatureFlagId(validFeatureFlagId)).toBeNull();
    });
  });
});
