import { describe, expect, it } from 'vitest';
import { AuthErrorResponseSchema, PasswordSchema } from '@controlplane/contracts';
import { AuthenticationService, AuthMiddleware } from '@controlplane/control-api';

describe('Phase 3.3 — Security Baseline Contract & Integration', () => {
  it('should validate strong password constraints against PasswordSchema', () => {
    // Valid password
    expect(PasswordSchema.safeParse('CorrectHorseBatteryStaple1!').success).toBe(true);

    // Invalid: no uppercase
    expect(PasswordSchema.safeParse('correcthorse1!').success).toBe(false);

    // Invalid: no special char
    expect(PasswordSchema.safeParse('CorrectHorse123').success).toBe(false);

    // Invalid: too short
    expect(PasswordSchema.safeParse('Short1!').success).toBe(false);
  });

  it('should format all security errors according to AuthErrorResponseSchema', async () => {
    const authService = new AuthenticationService();
    const middleware = new AuthMiddleware(authService);
    const protectedEndpoint = middleware.pipeline(async () => ({ data: 'secret' }));

    try {
      await protectedEndpoint({}, undefined);
      expect.unreachable('Should have failed');
    } catch (err: unknown) {
      const formatted = AuthMiddleware.formatErrorResponse(err);
      const parsed = AuthErrorResponseSchema.parse(formatted);

      expect(parsed.statusCode).toBe(401);
      expect(parsed.code).toBe('AUTH_HEADER_MISSING');
      expect(parsed.error).toBe('Unauthorized');
      expect(parsed.timestamp).toBeDefined();
    }
  });
});
