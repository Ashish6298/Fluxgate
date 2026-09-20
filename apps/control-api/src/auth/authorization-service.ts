import {
  evaluatePermission,
  type StandardAction,
  type StandardRole,
  type PermissionPolicyContext,
} from '@controlplane/config-model';
import type { AuthIdentity } from '@controlplane/contracts';
import { AuthorizationError } from './auth-middleware.js';

export class AuthorizationService {
  /**
   * Enforces action-level permissions against the caller's role at the Service Layer.
   */
  public enforce(
    identity: AuthIdentity,
    action: StandardAction,
    context?: PermissionPolicyContext,
  ): void {
    const role = identity.role as StandardRole;
    const result = evaluatePermission(role, action, context);

    if (!result.allowed) {
      if (result.decision === 'POLICY_REQUIRED') {
        throw new AuthorizationError(`Forbidden: ${result.reason}`, 'POLICY_APPROVAL_REQUIRED');
      }

      throw new AuthorizationError(
        `Forbidden: Role '${role}' is not authorized to perform '${action}'. ${result.reason}`,
        'ACTION_NOT_PERMITTED',
      );
    }
  }

  /**
   * Enforces tenant boundary isolation at the Service Layer.
   */
  public enforceTenantAccess(identity: AuthIdentity, targetOrganizationId: string): void {
    if (!identity.organizationId) {
      throw new AuthorizationError(
        'Forbidden: Caller has no active organization context',
        'ORGANIZATION_REQUIRED',
      );
    }

    if (identity.organizationId !== targetOrganizationId) {
      throw new AuthorizationError(
        `Forbidden: Tenant isolation mismatch. Caller organization '${identity.organizationId}' cannot access resource in '${targetOrganizationId}'`,
        'TENANT_ISOLATION_MISMATCH',
      );
    }
  }

  /**
   * Directly enforces that the caller has one of the required roles.
   */
  public enforceRole(identity: AuthIdentity, allowedRoles: StandardRole[]): void {
    const role = identity.role as StandardRole;
    if (!allowedRoles.includes(role)) {
      throw new AuthorizationError(
        `Forbidden: Insufficient role privileges. Required: [${allowedRoles.join(', ')}], current: '${role}'`,
        'INSUFFICIENT_ROLE_PRIVILEGES',
      );
    }
  }
}
