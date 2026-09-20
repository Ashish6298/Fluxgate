import { describe, expect, it } from 'vitest';
import { StandardActionSchema, STANDARD_ACTIONS, STANDARD_ROLES } from '@controlplane/contracts';
import { evaluatePermission, hasPermission } from '@controlplane/config-model';

describe('Phase 4.2 — Permission Matrix Contract & Integration', () => {
  it('should conform to the standard matrix table defined in the project specification', () => {
    /*
     * Matrix verification:
     *                      Owner Admin Developer Viewer
     *  View Flags           YES   YES     YES      YES
     *  Create Flags         YES   YES     YES      NO
     *  Modify Flags         YES   YES     YES      NO
     *  Production Rollout   YES   YES     POLICY   NO
     *  Rollback             YES   YES     YES      NO
     *  Delete Project       YES   NO      NO       NO
     */

    // View Flags
    expect(hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.VIEW_FLAGS)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.VIEW_FLAGS)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.VIEW_FLAGS)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.VIEW_FLAGS)).toBe(true);

    // Create Flags
    expect(hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.CREATE_FLAGS)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.CREATE_FLAGS)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.CREATE_FLAGS)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.CREATE_FLAGS)).toBe(false);

    // Modify Flags
    expect(hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.MODIFY_FLAGS)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.MODIFY_FLAGS)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.MODIFY_FLAGS)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.MODIFY_FLAGS)).toBe(false);

    // Rollback
    expect(hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.ROLLBACK)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.ROLLBACK)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.ROLLBACK)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.ROLLBACK)).toBe(false);

    // Delete Project
    expect(hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.DELETE_PROJECT)).toBe(true);
    expect(hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.DELETE_PROJECT)).toBe(false);
    expect(hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.DELETE_PROJECT)).toBe(false);
    expect(hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.DELETE_PROJECT)).toBe(false);
  });

  it('should accurately handle Developer Production Rollout Policy evaluation', () => {
    const defaultProdResult = evaluatePermission(
      STANDARD_ROLES.DEVELOPER,
      STANDARD_ACTIONS.PRODUCTION_ROLLOUT,
      { environmentType: 'PRODUCTION' },
    );

    expect(defaultProdResult.decision).toBe('POLICY_REQUIRED');
    expect(defaultProdResult.allowed).toBe(false);

    const approvedProdResult = evaluatePermission(
      STANDARD_ROLES.DEVELOPER,
      STANDARD_ACTIONS.PRODUCTION_ROLLOUT,
      {
        environmentType: 'PRODUCTION',
        allowDeveloperProductionRollout: true,
      },
    );

    expect(approvedProdResult.decision).toBe('ALLOW');
    expect(approvedProdResult.allowed).toBe(true);
  });

  it('should validate StandardActionSchema enumeration', () => {
    expect(StandardActionSchema.options).toContain('VIEW_FLAGS');
    expect(StandardActionSchema.options).toContain('CREATE_FLAGS');
    expect(StandardActionSchema.options).toContain('MODIFY_FLAGS');
    expect(StandardActionSchema.options).toContain('PRODUCTION_ROLLOUT');
    expect(StandardActionSchema.options).toContain('ROLLBACK');
    expect(StandardActionSchema.options).toContain('DELETE_PROJECT');
  });
});
