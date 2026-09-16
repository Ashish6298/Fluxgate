import { AuthenticationService, AuthMiddleware } from '@controlplane/control-api';
import { describe, expect, it } from 'vitest';

describe('PHASE 3.1 CONTRACT: User Authentication, Tokens & Protected Endpoints', () => {
  const authService = new AuthenticationService();
  const authMiddleware = new AuthMiddleware(authService);

  it('CONTRACT 1 (Registration): Must support registration strategy with secure password hashing', async () => {
    const session = await authService.register({
      email: 'lead.architect@company.com',
      name: 'Lead Architect',
      password: 'StrongSuperSecret99!',
      organizationName: 'Primary Enterprise',
    });

    expect(session.token).toMatch(/^cp_sess_[a-f0-9]{64}$/);
    expect(session.user.id).toBeDefined();
    expect(session.user.email).toBe('lead.architect@company.com');
  });

  it('CONTRACT 2 (Login & Verification): Must authenticate valid credentials and verify session tokens', async () => {
    const loginSession = await authService.login({
      email: 'lead.architect@company.com',
      password: 'StrongSuperSecret99!',
    });

    expect(loginSession.token).toBeDefined();

    const identity = await authService.verifyToken(loginSession.token);
    expect(identity.email).toBe('lead.architect@company.com');
    expect(identity.name).toBe('Lead Architect');
  });

  it('CONTRACT 3 (Protected Endpoints): Protected routes must enforce Bearer token verification', async () => {
    const session = await authService.login({
      email: 'lead.architect@company.com',
      password: 'StrongSuperSecret99!',
    });

    const protectedAction = authMiddleware.protect(async (req: { flagKey: string }, ctx) => {
      return {
        flagKey: req.flagKey,
        authorizedUser: ctx.identity.email,
      };
    });

    // Valid invocation
    const result = await protectedAction({ flagKey: 'feature_x' }, `Bearer ${session.token}`);
    expect(result.flagKey).toBe('feature_x');
    expect(result.authorizedUser).toBe('lead.architect@company.com');

    // Missing header rejected
    await expect(protectedAction({ flagKey: 'feature_x' }, undefined)).rejects.toThrow(
      /Missing Authorization header/,
    );
  });

  it('CONTRACT 4 (Logout): Logout must invalidate active session tokens immediately', async () => {
    const session = await authService.login({
      email: 'lead.architect@company.com',
      password: 'StrongSuperSecret99!',
    });

    // Logout
    const loggedOut = await authService.logout(session.token);
    expect(loggedOut).toBe(true);

    // Verification fails
    await expect(authService.verifyToken(session.token)).rejects.toThrow(/Invalid session token/);
  });
});
