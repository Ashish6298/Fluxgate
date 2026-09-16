import type { AuthIdentity } from '@controlplane/contracts';
import type { AuthenticationService } from './auth-service.js';

export interface ProtectedRequestContext {
  identity: AuthIdentity;
}

export type ProtectedHandler<TRequest, TResponse> = (
  req: TRequest,
  context: ProtectedRequestContext,
) => Promise<TResponse>;

export class AuthMiddleware {
  constructor(private authService: AuthenticationService) {}

  /**
   * Wraps an endpoint handler with authentication enforcement
   */
  public protect<TRequest, TResponse>(
    handler: ProtectedHandler<TRequest, TResponse>,
  ): (req: TRequest, authHeader?: string) => Promise<TResponse> {
    return async (req: TRequest, authHeader?: string): Promise<TResponse> => {
      if (!authHeader) {
        throw new Error('Unauthorized: Missing Authorization header');
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        throw new Error(
          'Unauthorized: Invalid Authorization header format. Expected Bearer <token>',
        );
      }

      const token = parts[1];
      const identity = await this.authService.verifyToken(token);

      return await handler(req, { identity });
    };
  }
}
