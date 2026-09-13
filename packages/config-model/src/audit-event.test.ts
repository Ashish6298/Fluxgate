import { describe, it, expect, beforeEach } from 'vitest';
import { createAuditEvent, InMemoryAuditEventRepository } from './index.js';

describe('AuditEvent Domain Model & Repository (Phase 1.8)', () => {
  const validOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const validOrgId2 = '223e4567-e89b-12d3-a456-426614174000';

  describe('createAuditEvent', () => {
    it('creates an immutable AuditEvent domain model', () => {
      const event = createAuditEvent({
        organizationId: validOrgId,
        actorId: 'developer_123',
        action: 'UPDATE_ROLLOUT',
        resourceType: 'ROLLOUT',
        resourceId: 'rollout_456',
        before: { percentage: 10 },
        after: { percentage: 25 },
      });

      expect(event.id).toBeDefined();
      expect(event.organizationId).toBe(validOrgId);
      expect(event.actorId).toBe('developer_123');
      expect(event.action).toBe('UPDATE_ROLLOUT');
      expect(event.resourceType).toBe('ROLLOUT');
      expect(event.resourceId).toBe('rollout_456');
      expect(event.before).toEqual({ percentage: 10 });
      expect(event.after).toEqual({ percentage: 25 });
      expect(event.createdAt).toBeDefined();

      // Runtime immutability
      expect(Object.isFrozen(event)).toBe(true);
      expect(() => {
        (event as unknown as { action: string }).action = 'TAMPERED';
      }).toThrow();
    });

    it('defaults before and after to null when not provided', () => {
      const event = createAuditEvent({
        organizationId: validOrgId,
        actorId: 'system',
        action: 'CREATE_ENVIRONMENT',
        resourceType: 'ENVIRONMENT',
        resourceId: 'env_1',
      });

      expect(event.before).toBeNull();
      expect(event.after).toBeNull();
    });
  });

  describe('InMemoryAuditEventRepository', () => {
    let repo: InMemoryAuditEventRepository;

    beforeEach(() => {
      repo = new InMemoryAuditEventRepository();
    });

    it('creates and finds audit event by id', async () => {
      const created = await repo.create({
        organizationId: validOrgId,
        actorId: 'dev_1',
        action: 'CREATE_FEATURE_FLAG',
        resourceType: 'FEATURE_FLAG',
        resourceId: 'flag_100',
        after: { key: 'new_checkout', defaultValue: false },
      });

      const found = await repo.findById(created.id);
      expect(found).toEqual(created);
    });

    it('lists audit events by organization maintaining chronological order', async () => {
      const e1 = await repo.create({
        organizationId: validOrgId,
        actorId: 'dev_1',
        action: 'CREATE_FEATURE_FLAG',
        resourceType: 'FEATURE_FLAG',
        resourceId: 'flag_100',
      });

      const e2 = await repo.create({
        organizationId: validOrgId,
        actorId: 'dev_2',
        action: 'UPDATE_ROLLOUT',
        resourceType: 'ROLLOUT',
        resourceId: 'rollout_100',
      });

      // Different organization event
      await repo.create({
        organizationId: validOrgId2,
        actorId: 'dev_3',
        action: 'CREATE_PROJECT',
        resourceType: 'PROJECT',
        resourceId: 'proj_200',
      });

      const orgEvents = await repo.listByOrganization(validOrgId);
      expect(orgEvents).toHaveLength(2);
      expect(orgEvents[0]?.id).toBe(e1.id);
      expect(orgEvents[1]?.id).toBe(e2.id);
    });

    it('filters audit events by resource and actor', async () => {
      await repo.create({
        organizationId: validOrgId,
        actorId: 'alice',
        action: 'CREATE_FEATURE_FLAG',
        resourceType: 'FEATURE_FLAG',
        resourceId: 'flag_1',
      });

      await repo.create({
        organizationId: validOrgId,
        actorId: 'bob',
        action: 'TOGGLE_FEATURE_FLAG',
        resourceType: 'FEATURE_FLAG',
        resourceId: 'flag_1',
      });

      await repo.create({
        organizationId: validOrgId,
        actorId: 'alice',
        action: 'UPDATE_ROLLOUT',
        resourceType: 'ROLLOUT',
        resourceId: 'rollout_1',
      });

      const flag1Events = await repo.listByResource('FEATURE_FLAG', 'flag_1');
      expect(flag1Events).toHaveLength(2);

      const aliceEvents = await repo.listByActor('alice');
      expect(aliceEvents).toHaveLength(2);
    });
  });
});
