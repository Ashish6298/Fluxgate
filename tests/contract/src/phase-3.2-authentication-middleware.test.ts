import { describe, expect, it } from 'vitest';
import { AuthRoleSchema, AuthIdentitySchema, AuthTokenTypeSchema } from '@controlplane/contracts';
import { AuthenticationService, AuthMiddleware } from '@controlplane/control-api';

describe('Phase 3.2 — Authentication Middleware Pipeline Contract & Integration', () => {
  it('should conform to the standard Request -> Auth -> Identity -> Authz -> Resource pipeline', async () => {
    const authService = new AuthenticationService();
    const middleware = new AuthMiddleware(authService);

    // Register user
    const session = await authService.register({
      email: 'admin@platform.io',
      name: 'Admin User',
      password: 'AdminSuperPassword123!',
      organizationName: 'Platform Inc',
    });

    let resourceExecuted = false;

    const testResourceEndpoint = middleware.pipeline(
      async (req: { action: string }, ctx) => {
        resourceExecuted = true;
        // Verify identity shape satisfies AuthIdentitySchema
        const validatedIdentity = AuthIdentitySchema.parse(ctx.identity);
        expect(validatedIdentity.email).toBe('admin@platform.io');
        expect(AuthTokenTypeSchema.parse(ctx.tokenType)).toBe('SESSION_BEARER');
        return { success: true, action: req.action };
      },
      {
        roles: ['OWNER', 'ADMIN'],
        requireOrganization: true,
      },
    );

    const response = await testResourceEndpoint(
      { action: 'RELEASE_FLAG' },
      `Bearer ${session.token}`,
    );

    expect(resourceExecuted).toBe(true);
    expect(response.success).toBe(true);
  });

  it('should validate role enumeration against AuthRoleSchema', () => {
    expect(AuthRoleSchema.options).toEqual(['OWNER', 'ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER']);
  });
});
