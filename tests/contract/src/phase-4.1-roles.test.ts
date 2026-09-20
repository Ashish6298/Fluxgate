import { describe, expect, it } from 'vitest';
import {
  StandardRoleSchema,
  STANDARD_ROLES,
  STANDARD_ROLE_METADATA,
} from '@controlplane/contracts';
import { createStandardRoles, InMemoryRoleRepository } from '@controlplane/config-model';

describe('Phase 4.1 — Roles Contract & Integration', () => {
  it('should define and support the four required standard roles: Owner, Admin, Developer, Viewer', () => {
    expect(StandardRoleSchema.options).toEqual(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']);

    expect(STANDARD_ROLES.OWNER).toBe('OWNER');
    expect(STANDARD_ROLES.ADMIN).toBe('ADMIN');
    expect(STANDARD_ROLES.DEVELOPER).toBe('DEVELOPER');
    expect(STANDARD_ROLES.VIEWER).toBe('VIEWER');

    const orgId = '00000000-0000-0000-0000-000000000001';
    const roles = createStandardRoles(orgId);

    expect(roles).toHaveLength(4);
    const roleNames = roles.map((r) => r.name);
    expect(roleNames).toContain('Owner');
    expect(roleNames).toContain('Admin');
    expect(roleNames).toContain('Developer');
    expect(roleNames).toContain('Viewer');

    expect(STANDARD_ROLE_METADATA.OWNER.name).toBe('Owner');
    expect(STANDARD_ROLE_METADATA.ADMIN.name).toBe('Admin');
    expect(STANDARD_ROLE_METADATA.DEVELOPER.name).toBe('Developer');
    expect(STANDARD_ROLE_METADATA.VIEWER.name).toBe('Viewer');
  });

  it('should enforce unique role name constraints per organization in repository', async () => {
    const repo = new InMemoryRoleRepository();
    const orgA = '00000000-0000-0000-0000-000000000001';
    const orgB = '00000000-0000-0000-0000-000000000002';

    await repo.create({ organizationId: orgA, name: 'Developer' });
    // Same name in different org -> ALLOWED
    await expect(repo.create({ organizationId: orgB, name: 'Developer' })).resolves.toBeDefined();

    // Same name in same org -> MUST FAIL
    await expect(repo.create({ organizationId: orgA, name: 'Developer' })).rejects.toThrow(
      /already exists/,
    );
  });
});
