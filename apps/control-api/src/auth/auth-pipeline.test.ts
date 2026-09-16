import { describe, expect, it } from 'vitest';
import {
  AuthenticationService,
  AuthMiddleware,
  AuthenticationError,
  AuthorizationError,
} from '../index.js';

describe('Authentication & Authorization Pipeline (Phase 3.2)', () => {
  const authService = new AuthenticationService();
  const middleware = new AuthMiddleware(authService);

  it('should execute full 4-stage pipeline: Request -> Authentication -> Identity -> Authorization -> Resource', async () => {
    // 1. Register owner
    const session = await authService.register({
      email: 'lead@enterprise.com',
      name: 'Tech Lead',
      password: 'StrongPassword123!',
      organizationName: 'Enterprise Corp',
    });

    const userOrgId = (await authService.verifyToken(session.token)).organizationId;
    expect(userOrgId).toBeDefined();

    // Create a protected endpoint requiring OWNER or ADMIN role and tenant isolation
    const updateFlagEndpoint = middleware.pipeline(
      async (req: { flagKey: string; enabled: boolean }, ctx) => {
        return {
          status: 'SUCCESS',
          flagKey: req.flagKey,
          enabled: req.enabled,
          executedBy: ctx.identity.userId,
          authType: ctx.tokenType,
        };
      },
      {
        roles: ['OWNER', 'ADMIN'],
        requireOrganization: true,
      },
      () => userOrgId,
    );

    // Call with valid bearer token
    const result = await updateFlagEndpoint(
      { flagKey: 'dark_mode', enabled: true },
      `Bearer ${session.token}`,
    );

    expect(result.status).toBe('SUCCESS');
    expect(result.flagKey).toBe('dark_mode');
    expect(result.enabled).toBe(true);
    expect(result.authType).toBe('SESSION_BEARER');
  });

  it('should enforce Authentication stage (reject missing or malformed headers)', async () => {
    const endpoint = middleware.pipeline(async () => ({ ok: true }));

    // Missing header
    await expect(endpoint({}, undefined)).rejects.toThrow(AuthenticationError);
    await expect(endpoint({}, undefined)).rejects.toThrow(/Missing Authorization header/);

    // Malformed header
    await expect(endpoint({}, 'InvalidFormat')).rejects.toThrow(AuthenticationError);
    await expect(endpoint({}, 'InvalidFormat')).rejects.toThrow(
      /Invalid Authorization header format/,
    );

    // Invalid scheme
    await expect(endpoint({}, 'Basic dXNlcjpwYXNz')).rejects.toThrow(
      /Unsupported authorization scheme/,
    );
  });

  it('should enforce Identity stage (reject unknown or expired tokens)', async () => {
    const endpoint = middleware.pipeline(async () => ({ ok: true }));

    await expect(
      endpoint(
        {},
        'Bearer cp_sess_0000000000000000000000000000000000000000000000000000000000000000',
      ),
    ).rejects.toThrow(AuthenticationError);
  });

  it('should enforce Authorization stage for insufficient roles', async () => {
    // Register viewer user
    const viewerSession = await authService.register({
      email: 'viewer@enterprise.com',
      name: 'Viewer Person',
      password: 'ViewerPassword123!',
    });

    const endpointRequiringAdmin = middleware.pipeline(async () => ({ ok: true }), {
      roles: ['ADMIN', 'OWNER'],
    });

    await expect(endpointRequiringAdmin({}, `Bearer ${viewerSession.token}`)).rejects.toThrow(
      AuthorizationError,
    );
    await expect(endpointRequiringAdmin({}, `Bearer ${viewerSession.token}`)).rejects.toThrow(
      /Forbidden: Insufficient privileges/,
    );
  });

  it('should enforce Authorization stage for tenant boundary isolation', async () => {
    const session = await authService.register({
      email: 'tenant_a@domain.com',
      name: 'Tenant A User',
      password: 'TenantPassword123!',
      organizationName: 'Tenant A Org',
    });

    const endpointScopedToOtherTenant = middleware.pipeline(
      async () => ({ ok: true }),
      { requireOrganization: true },
      () => '00000000-0000-0000-0000-000000000099', // target org differs
    );

    await expect(endpointScopedToOtherTenant({}, `Bearer ${session.token}`)).rejects.toThrow(
      AuthorizationError,
    );
    await expect(endpointScopedToOtherTenant({}, `Bearer ${session.token}`)).rejects.toThrow(
      /Tenant isolation mismatch/,
    );
  });
});
