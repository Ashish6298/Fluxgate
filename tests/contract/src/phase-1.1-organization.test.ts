import { describe, it, expect } from 'vitest';
import { OrganizationSchema, CreateOrganizationInputSchema } from '@controlplane/contracts';
import { createOrganization, InMemoryOrganizationRepository } from '@controlplane/config-model';

describe('PHASE 1.1 — Organization Domain Model Verification', () => {
  it('should verify Organization schema has required fields: id, name, createdAt, updatedAt', () => {
    const rawOrg = {
      id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      name: 'Acme Developer Corp',
      createdAt: '2026-09-13T12:00:00.000Z',
      updatedAt: '2026-09-13T12:00:00.000Z',
    };

    const parsed = OrganizationSchema.safeParse(rawOrg);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(Object.keys(parsed.data).sort()).toEqual(
        ['createdAt', 'id', 'name', 'updatedAt'].sort(),
      );
    }
  });

  it('should validate organization creation constraints and helper functions', () => {
    // Empty name rejected
    expect(CreateOrganizationInputSchema.safeParse({ name: '' }).success).toBe(false);
    expect(CreateOrganizationInputSchema.safeParse({ name: '   ' }).success).toBe(false);

    // Valid name accepted and trimmed
    const valid = CreateOrganizationInputSchema.safeParse({ name: '  Cyberdyne Systems  ' });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.name).toBe('Cyberdyne Systems');
    }

    // Helper factory function
    const org = createOrganization({ name: 'Weyland-Yutani' });
    expect(org.id).toBeDefined();
    expect(org.name).toBe('Weyland-Yutani');
  });

  it('should verify unique organization tenant identification in repository', async () => {
    const repo = new InMemoryOrganizationRepository();
    const orgId = '777e4567-e89b-12d3-a456-426614174777';

    const org1 = await repo.create({ name: 'Tenant Alpha' }, orgId);
    expect(org1.id).toBe(orgId);

    // Uniqueness constraint check
    await expect(repo.create({ name: 'Tenant Beta' }, orgId)).rejects.toThrow();
  });
});
