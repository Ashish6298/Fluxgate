import { describe, it, expect } from 'vitest';
import {
  AuditEventSchema,
  CreateAuditEventInputSchema,
  AuditEventIdSchema,
  ActorIdSchema,
  AuditActionSchema,
  AuditResourceTypeSchema,
  AuditResourceIdSchema,
} from './index.js';

describe('AuditEvent Domain Model Contract (Phase 1.8)', () => {
  const validOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const validEventId = '987fcdeb-51a2-43d7-9876-543210987654';

  describe('Field Schemas', () => {
    it('validates UUID for AuditEvent ID', () => {
      expect(AuditEventIdSchema.safeParse(validEventId).success).toBe(true);
      expect(AuditEventIdSchema.safeParse('not-a-uuid').success).toBe(false);
    });

    it('validates non-empty actorId, action, resourceType, and resourceId', () => {
      expect(ActorIdSchema.safeParse('developer_123').success).toBe(true);
      expect(ActorIdSchema.safeParse('').success).toBe(false);

      expect(AuditActionSchema.safeParse('UPDATE_ROLLOUT').success).toBe(true);
      expect(AuditActionSchema.safeParse('').success).toBe(false);

      expect(AuditResourceTypeSchema.safeParse('FEATURE_FLAG').success).toBe(true);
      expect(AuditResourceTypeSchema.safeParse('').success).toBe(false);

      expect(AuditResourceIdSchema.safeParse('flag-id-uuid').success).toBe(true);
      expect(AuditResourceIdSchema.safeParse('').success).toBe(false);
    });
  });

  describe('AuditEventSchema', () => {
    it('validates a complete audit event record with before and after state', () => {
      const record = {
        id: validEventId,
        organizationId: validOrgId,
        actorId: 'developer_123',
        action: 'UPDATE_ROLLOUT',
        resourceType: 'ROLLOUT',
        resourceId: 'rollout_456',
        before: { percentage: 10 },
        after: { percentage: 25 },
        createdAt: new Date().toISOString(),
      };

      const result = AuditEventSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('validates creation events where before is null', () => {
      const record = {
        id: validEventId,
        organizationId: validOrgId,
        actorId: 'admin_user',
        action: 'CREATE_FEATURE_FLAG',
        resourceType: 'FEATURE_FLAG',
        resourceId: 'flag_789',
        before: null,
        after: { key: 'new_checkout', defaultValue: false },
        createdAt: new Date().toISOString(),
      };

      const result = AuditEventSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('validates deletion events where after is null', () => {
      const record = {
        id: validEventId,
        organizationId: validOrgId,
        actorId: 'admin_user',
        action: 'DELETE_FEATURE_FLAG',
        resourceType: 'FEATURE_FLAG',
        resourceId: 'flag_789',
        before: { key: 'new_checkout', defaultValue: false },
        after: null,
        createdAt: new Date().toISOString(),
      };

      const result = AuditEventSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('rejects invalid audit event records', () => {
      const record = {
        id: 'bad-id',
        organizationId: validOrgId,
        actorId: '',
        action: '',
        resourceType: '',
        resourceId: '',
        before: 'not-an-object',
        after: 'not-an-object',
        createdAt: 'invalid-date',
      };

      const result = AuditEventSchema.safeParse(record);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateAuditEventInputSchema', () => {
    it('defaults before and after to null if omitted', () => {
      const input = {
        organizationId: validOrgId,
        actorId: 'system',
        action: 'KILL_SWITCH_ACTIVATED',
        resourceType: 'FEATURE_FLAG',
        resourceId: 'flag_123',
      };

      const parsed = CreateAuditEventInputSchema.parse(input);
      expect(parsed.before).toBeNull();
      expect(parsed.after).toBeNull();
    });
  });
});
