import { describe, expect, it } from 'vitest';
import type { AuthIdentity } from '@controlplane/contracts';
import {
  AuthorizationService,
  AuthorizationError,
  ProjectManagementService,
} from '@controlplane/control-api';

describe('Phase 4.3 — Service Layer Authorization Contract & Integration', () => {
  const orgA = '00000000-0000-0000-0000-000000000001';
  const orgB = '00000000-0000-0000-0000-000000000002';

  const devIdentity: AuthIdentity = {
    userId: '00000000-0000-0000-0000-000000000003',
    email: 'dev@tenant.com',
    name: 'Dev User',
    organizationId: orgA,
    role: 'DEVELOPER',
  };

  const adminIdentity: AuthIdentity = {
    userId: '00000000-0000-0000-0000-000000000004',
    email: 'admin@tenant.com',
    name: 'Admin User',
    organizationId: orgA,
    role: 'ADMIN',
  };

  it('should enforce that authorization checks execute at the Service Layer before database operations', async () => {
    const authz = new AuthorizationService();

    // Verify service-level direct enforcement
    expect(() => authz.enforce(devIdentity, 'CREATE_FLAGS')).not.toThrow();
    expect(() => authz.enforce(devIdentity, 'DELETE_PROJECT')).toThrow(AuthorizationError);

    expect(() => authz.enforceTenantAccess(devIdentity, orgA)).not.toThrow();
    expect(() => authz.enforceTenantAccess(devIdentity, orgB)).toThrow(AuthorizationError);
  });

  it('should prevent unauthorized service layer invocation regardless of transport layer', async () => {
    const projectService = new ProjectManagementService();

    // Admin invoking delete project service method directly -> must fail
    await expect(projectService.deleteProject(adminIdentity, orgA, 'project-123')).rejects.toThrow(
      /Only Owner role is authorized/,
    );
  });
});
