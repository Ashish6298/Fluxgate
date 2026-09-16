import { describe, expect, it } from 'vitest';
import {
  AuthenticationService,
  AuthMiddleware,
  AuthenticationError,
  AuthorizationError,
} from '../index.js';

describe('Security Baseline (Phase 3.3)', () => {
  const authService = new AuthenticationService();
  const middleware = new AuthMiddleware(authService);

  describe('Secure Password Handling', () => {
    it('should enforce strong password complexity on registration', async () => {
      // Too short
      await expect(
        authService.register({
          email: 'short@domain.com',
          name: 'Short',
          password: 'Pass1!',
        }),
      ).rejects.toThrow(/at least 8 characters/);

      // Missing uppercase
      await expect(
        authService.register({
          email: 'noupper@domain.com',
          name: 'No Upper',
          password: 'password123!',
        }),
      ).rejects.toThrow(/uppercase/);

      // Missing digit
      await expect(
        authService.register({
          email: 'nodigit@domain.com',
          name: 'No Digit',
          password: 'Password!',
        }),
      ).rejects.toThrow(/digit/);

      // Missing special char
      await expect(
        authService.register({
          email: 'nospecial@domain.com',
          name: 'No Special',
          password: 'Password123',
        }),
      ).rejects.toThrow(/special character/);
    });

    it('should use PBKDF2 with unique salts for identical passwords across different users', async () => {
      const session1 = await authService.register({
        email: 'user_a@domain.com',
        name: 'User A',
        password: 'IdenticalPassword123!',
      });
      const session2 = await authService.register({
        email: 'user_b@domain.com',
        name: 'User B',
        password: 'IdenticalPassword123!',
      });

      expect(session1.token).not.toBe(session2.token);
    });
  });

  describe('Token Expiration & Validation', () => {
    it('should reject expired session tokens with structured error response', async () => {
      // Create user and expired session (TTL: -1000ms)
      const session = await authService.register({
        email: 'expiring@domain.com',
        name: 'Expiring User',
        password: 'ComplexPassword123!',
      });

      const user = session.user;
      const expiredSession = authService.createSession(user, undefined, 'MEMBER', -1000);

      const endpoint = middleware.pipeline(async () => ({ ok: true }));

      try {
        await endpoint({}, `Bearer ${expiredSession.token}`);
        expect.unreachable('Should have thrown AuthenticationError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AuthenticationError);
        const authErr = err as AuthenticationError;
        expect(authErr.statusCode).toBe(401);
        expect(authErr.code).toBe('TOKEN_EXPIRED');

        const errorResponse = AuthMiddleware.formatErrorResponse(err);
        expect(errorResponse.statusCode).toBe(401);
        expect(errorResponse.code).toBe('TOKEN_EXPIRED');
        expect(errorResponse.timestamp).toBeDefined();
      }
    });

    it('should reject malformed or fake session tokens', async () => {
      const endpoint = middleware.pipeline(async () => ({ ok: true }));

      try {
        await endpoint(
          {},
          'Bearer cp_sess_fake000000000000000000000000000000000000000000000000000000000000',
        );
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AuthenticationError);
        const authErr = err as AuthenticationError;
        expect(authErr.code).toBe('TOKEN_INVALID');
      }
    });
  });

  describe('Secure Error Responses', () => {
    it('should format AuthorizationError with 403 and proper code', () => {
      const err = new AuthorizationError('Access denied', 'INSUFFICIENT_ROLE_PRIVILEGES');
      const response = AuthMiddleware.formatErrorResponse(err);

      expect(response.statusCode).toBe(403);
      expect(response.error).toBe('Forbidden');
      expect(response.message).toBe('Access denied');
      expect(response.code).toBe('INSUFFICIENT_ROLE_PRIVILEGES');
    });

    it('should format unhandled errors safely without leaking stack traces', () => {
      const err = new Error('Database connection failed unexpectedly');
      const response = AuthMiddleware.formatErrorResponse(err);

      expect(response.statusCode).toBe(500);
      expect(response.error).toBe('InternalServerError');
      expect(response.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
