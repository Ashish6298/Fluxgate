import { describe, it, expect } from 'vitest';
import {
  AuditEventSchema,
  createAuditEvent,
  InMemoryAuditEventRepository,
  createOrganization,
  createProject,
  createEnvironment,
  createFeatureFlag,
  createTargetingRule,
  createRollout,
  createConfigurationVersion,
} from '@controlplane/config-model';

describe('PHASE 1.8 — Audit Event Contract & Milestone 1 Domain Completion', () => {
  const dummyOrgId = 'a1a2a3a4-b1b2-c1c2-d1d2-e1e2e3e4e5e6';

  it('adheres to Phase 1.8 AuditEvent model specification', () => {
    const event = createAuditEvent({
      organizationId: dummyOrgId,
      actorId: 'developer_123',
      action: 'UPDATE_ROLLOUT',
      resourceType: 'ROLLOUT',
      resourceId: 'rollout_999',
      before: { percentage: 10 },
      after: { percentage: 25 },
    });

    // Verify presence of all required fields from phase.txt
    expect(event).toHaveProperty('id');
    expect(event).toHaveProperty('organizationId', dummyOrgId);
    expect(event).toHaveProperty('actorId', 'developer_123');
    expect(event).toHaveProperty('action', 'UPDATE_ROLLOUT');
    expect(event).toHaveProperty('resourceType', 'ROLLOUT');
    expect(event).toHaveProperty('resourceId', 'rollout_999');
    expect(event).toHaveProperty('before', { percentage: 10 });
    expect(event).toHaveProperty('after', { percentage: 25 });
    expect(event).toHaveProperty('createdAt');

    const validated = AuditEventSchema.safeParse(event);
    expect(validated.success).toBe(true);
  });

  it('verifies exact specification example: actor developer_123, action UPDATE_ROLLOUT, before 10%, after 25%', async () => {
    const repo = new InMemoryAuditEventRepository();

    const auditEntry = await repo.create({
      organizationId: dummyOrgId,
      actorId: 'developer_123',
      action: 'UPDATE_ROLLOUT',
      resourceType: 'ROLLOUT',
      resourceId: 'rollout_123',
      before: { percentage: 10 },
      after: { percentage: 25 },
    });

    expect(auditEntry.actorId).toBe('developer_123');
    expect(auditEntry.action).toBe('UPDATE_ROLLOUT');
    expect(auditEntry.before).toEqual({ percentage: 10 });
    expect(auditEntry.after).toEqual({ percentage: 25 });

    // Verify append-only immutability
    expect(Object.isFrozen(auditEntry)).toBe(true);
    expect(() => {
      (auditEntry as unknown as { action: string }).action = 'TAMPERED';
    }).toThrow();
  });

  it('verifies MILESTONE 1 COMPLETION: all 8 core domain models successfully instantiate and integrate', () => {
    // 1.1 Organization
    const org = createOrganization({ name: 'Acme Corp' });
    expect(org.id).toBeDefined();

    // 1.2 Project
    const proj = createProject({
      organizationId: org.id,
      name: 'Mobile App',
      key: 'mobile-app',
    });
    expect(proj.organizationId).toBe(org.id);

    // 1.3 Environment
    const env = createEnvironment({
      projectId: proj.id,
      name: 'Production',
      key: 'production',
      type: 'PRODUCTION',
    });
    expect(env.projectId).toBe(proj.id);

    // 1.4 Feature Flag
    const flag = createFeatureFlag({
      environmentId: env.id,
      key: 'new_checkout',
      name: 'New Checkout Flow',
      type: 'BOOLEAN',
      defaultValue: false,
    });
    expect(flag.environmentId).toBe(env.id);

    // 1.5 Targeting Rule
    const rule = createTargetingRule({
      featureFlagId: flag.id,
      priority: 0,
      conditions: [{ attribute: 'country', operator: 'EQUALS', value: 'IN' }],
      value: true,
    });
    expect(rule.featureFlagId).toBe(flag.id);

    // 1.6 Rollout
    const rollout = createRollout({
      featureFlagId: flag.id,
      percentage: 25,
      salt: 'v1',
    });
    expect(rollout.featureFlagId).toBe(flag.id);

    // 1.7 Configuration Version
    const version = createConfigurationVersion({
      environmentId: env.id,
      version: 1,
      snapshot: {
        schemaVersion: 1,
        projectKey: proj.key,
        environmentKey: env.key,
        configurationVersion: 1,
        flags: [{ ...flag, rules: [rule], rollout }],
      },
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      createdBy: 'admin',
    });
    expect(version.environmentId).toBe(env.id);

    // 1.8 Audit Event
    const audit = createAuditEvent({
      organizationId: org.id,
      actorId: 'admin',
      action: 'INITIALIZE_ENVIRONMENT',
      resourceType: 'ENVIRONMENT',
      resourceId: env.id,
      before: null,
      after: { version: 1 },
    });
    expect(audit.organizationId).toBe(org.id);
  });
});
