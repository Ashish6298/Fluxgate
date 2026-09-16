import { describe, expect, it } from 'vitest';
import {
  createRole,
  createStandardRoles,
  InMemoryRoleRepository,
  STANDARD_ROLES,
  STANDARD_ROLE_METADATA,
  StandardRoleSchema,
} from './index.js';

describe('Role Domain Model (Phase 4.1)', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  it('should instantiate and validate individual role using createRole', () => {
    const role = createRole({
      organizationId: orgId,
      name: 'CustomRole',
      description: 'Custom description',
      permissions: ['flags:read'],
    });

    expect(role.id).toBeDefined();
    expect(role.name).toBe('CustomRole');
    expect(role.permissions).toEqual(['flags:read']);
  });

  it('should instantiate and validate standard roles: Owner, Admin, Developer, Viewer', () => {
    const standardRoles = createStandardRoles(orgId);
    expect(standardRoles).toHaveLength(4);

    const names = standardRoles.map((r) => r.name);
    expect(names).toContain('Owner');
    expect(names).toContain('Admin');
    expect(names).toContain('Developer');
    expect(names).toContain('Viewer');

    standardRoles.forEach((role) => {
      expect(role.organizationId).toBe(orgId);
      expect(role.id).toBeDefined();
      expect(role.createdAt).toBeDefined();
      expect(role.updatedAt).toBeDefined();
    });
  });

  it('should conform to StandardRoleSchema enumeration and metadata', () => {
    expect(StandardRoleSchema.options).toEqual(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']);
    expect(STANDARD_ROLES.OWNER).toBe('OWNER');
    expect(STANDARD_ROLES.ADMIN).toBe('ADMIN');
    expect(STANDARD_ROLES.DEVELOPER).toBe('DEVELOPER');
    expect(STANDARD_ROLES.VIEWER).toBe('VIEWER');

    expect(STANDARD_ROLE_METADATA.OWNER.defaultPermissions).toEqual(['*']);
    expect(STANDARD_ROLE_METADATA.ADMIN.defaultPermissions).toContain('projects:*');
    expect(STANDARD_ROLE_METADATA.DEVELOPER.defaultPermissions).toContain('flags:*');
    expect(STANDARD_ROLE_METADATA.VIEWER.defaultPermissions).toContain('flags:read');
  });

  it('should manage roles via InMemoryRoleRepository', async () => {
    const repo = new InMemoryRoleRepository();

    const role = await repo.create({
      organizationId: orgId,
      name: 'Developer',
      description: 'Engineering role',
      permissions: ['flags:read', 'flags:write'],
    });

    expect(role.id).toBeDefined();
    expect(role.name).toBe('Developer');

    const retrieved = await repo.findById(role.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('Developer');

    const byName = await repo.findByOrganizationAndName(orgId, 'developer');
    expect(byName).not.toBeNull();
    expect(byName?.id).toBe(role.id);

    const orgRoles = await repo.listByOrganization(orgId);
    expect(orgRoles).toHaveLength(1);

    // Duplicate name in same org should fail
    await expect(
      repo.create({
        organizationId: orgId,
        name: 'Developer',
      }),
    ).rejects.toThrow(/already exists/);

    const deleted = await repo.delete(role.id);
    expect(deleted).toBe(true);
    expect(await repo.findById(role.id)).toBeNull();
  });
});
