import type {
  AuthIdentity,
  AuthRole,
  AuthorizationRequirement,
  AuthenticatedRequestContext,
} from '@controlplane/contracts';
import type { AuthenticationService } from './auth-service.js';

export interface ProtectedRequestContext {
  identity: AuthIdentity;
}

export type ProtectedHandler<TRequest, TResponse> = (
  req: TRequest,
  context: AuthenticatedRequestContext,
) => Promise<TResponse>;

export class AuthenticationError extends Error {
  public readonly statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * PHASE 3.2 Authentication & Authorization Middleware Pipeline
 *
 * Implements the 4-stage pipeline:
 *
 * Request
 *   │
 *   ▼
 * Authentication (Credential parsing & cryptographic validity / expiration check)
 *   │
 *   ▼
 * Identity (Resolve active user / service principal identity)
 *   │
 *   ▼
 * Authorization (Verify roles, permissions & tenant boundaries)
 *   │
 *   ▼
 * Resource (Invoke protected handler)
 */
export class AuthMiddleware {
  constructor(private authService: AuthenticationService) {}

  /**
   * Stage 1: Authentication
   * Extracts and validates the token from the Authorization header.
   */
  public authenticate(authHeader?: string): { token: string; type: 'SESSION_BEARER' | 'API_KEY' } {
    if (!authHeader) {
      throw new AuthenticationError('Missing Authorization header');
    }

    const parts = authHeader.trim().split(/\s+/);
    if (parts.length !== 2) {
      throw new AuthenticationError(
        'Invalid Authorization header format. Expected Bearer <token> or ApiKey <key>',
      );
    }

    const [scheme, credential] = parts;
    if (scheme === 'Bearer') {
      if (!credential || !credential.startsWith('cp_sess_')) {
        throw new AuthenticationError('Invalid session token format');
      }
      return { token: credential, type: 'SESSION_BEARER' };
    } else if (scheme === 'ApiKey') {
      if (!credential || !credential.startsWith('cp_live_')) {
        throw new AuthenticationError('Invalid API key format');
      }
      return { token: credential, type: 'API_KEY' };
    }

    throw new AuthenticationError(`Unsupported authorization scheme: ${scheme}`);
  }

  /**
   * Stage 2: Identity Resolution
   * Resolves the verified identity from the extracted token.
   */
  public async resolveIdentity(token: string): Promise<AuthIdentity> {
    try {
      return await this.authService.verifyToken(token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired token';
      throw new AuthenticationError(msg);
    }
  }

  /**
   * Stage 3: Authorization
   * Verifies that the resolved identity satisfies role, tenant, and permission constraints.
   */
  public authorize(
    identity: AuthIdentity,
    requirements?: AuthorizationRequirement,
    targetOrganizationId?: string,
  ): void {
    if (!requirements) {
      return;
    }

    // Role check
    if (requirements.roles && requirements.roles.length > 0) {
      const hasAllowedRole = requirements.roles.includes(identity.role as AuthRole);
      if (!hasAllowedRole) {
        throw new AuthorizationError(
          `Forbidden: Insufficient privileges. Required one of: ${requirements.roles.join(', ')} (current: ${identity.role})`,
        );
      }
    }

    // Tenant check
    if (requirements.requireOrganization) {
      if (!identity.organizationId) {
        throw new AuthorizationError('Forbidden: User does not belong to an active organization');
      }
      if (targetOrganizationId && identity.organizationId !== targetOrganizationId) {
        throw new AuthorizationError('Forbidden: Tenant isolation mismatch');
      }
    }
  }

  /**
   * Complete Pipeline: Wraps an endpoint handler executing Request -> Auth -> Identity -> Authz -> Resource
   */
  public pipeline<TRequest, TResponse>(
    handler: ProtectedHandler<TRequest, TResponse>,
    requirements?: AuthorizationRequirement,
    extractTargetOrgId?: (req: TRequest) => string | undefined,
  ): (req: TRequest, authHeader?: string) => Promise<TResponse> {
    return async (req: TRequest, authHeader?: string): Promise<TResponse> => {
      // 1. Authentication
      const { token, type } = this.authenticate(authHeader);

      // 2. Identity
      const identity = await this.resolveIdentity(token);

      // 3. Authorization
      const targetOrgId = extractTargetOrgId ? extractTargetOrgId(req) : undefined;
      this.authorize(identity, requirements, targetOrgId);

      // 4. Resource Execution
      const context: AuthenticatedRequestContext = {
        identity,
        tokenType: type,
        token,
      };

      return await handler(req, context);
    };
  }

  /**
   * Backward-compatible simple protect wrapper
   */
  public protect<TRequest, TResponse>(
    handler: (req: TRequest, context: { identity: AuthIdentity }) => Promise<TResponse>,
  ): (req: TRequest, authHeader?: string) => Promise<TResponse> {
    return async (req: TRequest, authHeader?: string): Promise<TResponse> => {
      if (!authHeader) {
        throw new AuthenticationError('Unauthorized: Missing Authorization header');
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        throw new AuthenticationError(
          'Unauthorized: Invalid Authorization header format. Expected Bearer <token>',
        );
      }

      const token = parts[1];
      const identity = await this.resolveIdentity(token);

      return await handler(req, { identity });
    };
  }
}
