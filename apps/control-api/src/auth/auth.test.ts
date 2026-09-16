import { describe, expect, it } from 'vitest';
import { AuthenticationService, AuthMiddleware } from '../index.js';

describe('User Authentication & Session Management (Phase 3.1)', () => {
  const authService = new AuthenticationService();
  const middleware = new AuthMiddleware(authService);

  it('should register a new user with password hashing and session generation', async () => {
    const session = await authService.register({
      email: 'founder@startup.io',
      name: 'Founder Person',
      password: 'SecurePassword123!',
      organizationName: 'Startup Inc',
    });

    expect(session.token).toMatch(/^cp_sess_[a-f0-9]{64}$/);
    expect(session.user.email).toBe('founder@startup.io');
    expect(session.user.name).toBe('Founder Person');
    expect(session.expiresAt).toBeDefined();

    // Verification of token
    const identity = await authService.verifyToken(session.token);
    expect(identity.userId).toBe(session.user.id);
    expect(identity.email).toBe('founder@startup.io');
    expect(identity.role).toBe('OWNER');
    expect(identity.organizationId).toBeDefined();
  });

  it('should reject registration if email is already registered', async () => {
    await expect(
      authService.register({
        email: 'founder@startup.io',
        name: 'Another Person',
        password: 'AnotherPassword456!',
      }),
    ).rejects.toThrow(/already exists/);
  });

  it('should authenticate user via login with valid credentials', async () => {
    const loginSession = await authService.login({
      email: 'founder@startup.io',
      password: 'SecurePassword123!',
    });

    expect(loginSession.token).toMatch(/^cp_sess_[a-f0-9]{64}$/);
    expect(loginSession.user.email).toBe('founder@startup.io');
  });

  it('should reject login with invalid password or non-existent email', async () => {
    await expect(
      authService.login({
        email: 'founder@startup.io',
        password: 'WrongPassword!',
      }),
    ).rejects.toThrow(/Invalid email or password/);

    await expect(
      authService.login({
        email: 'nonexistent@startup.io',
        password: 'Password123!',
      }),
    ).rejects.toThrow(/Invalid email or password/);
  });

  it('should enforce protected endpoint access via AuthMiddleware', async () => {
    const session = await authService.login({
      email: 'founder@startup.io',
      password: 'SecurePassword123!',
    });

    // Define protected mock endpoint
    const getSecretResource = middleware.protect(async (req: { query: string }, ctx) => {
      return {
        query: req.query,
        callerEmail: ctx.identity.email,
        access: 'granted',
      };
    });

    // Call with valid Authorization header
    const response = await getSecretResource(
      { query: 'confidential_metrics' },
      `Bearer ${session.token}`,
    );

    expect(response.access).toBe('granted');
    expect(response.callerEmail).toBe('founder@startup.io');

    // Call with missing header -> MUST FAIL
    await expect(getSecretResource({ query: 'confidential_metrics' }, undefined)).rejects.toThrow(
      /Missing Authorization header/,
    );

    // Call with invalid token -> MUST FAIL
    await expect(
      getSecretResource({ query: 'confidential_metrics' }, 'Bearer invalid_token'),
    ).rejects.toThrow(/Invalid session token/);
  });

  it('should successfully log out and invalidate session token', async () => {
    const session = await authService.login({
      email: 'founder@startup.io',
      password: 'SecurePassword123!',
    });

    const logoutResult = await authService.logout(session.token);
    expect(logoutResult).toBe(true);

    // Attempting to verify token after logout must fail
    await expect(authService.verifyToken(session.token)).rejects.toThrow(/Invalid session token/);
  });
});
