import { describe, expect, it } from 'vitest';
import { evaluatePermission, hasPermission, STANDARD_ACTIONS, STANDARD_ROLES } from './index.js';

describe('Permission Matrix (Phase 4.2)', () => {
  describe('View Flags', () => {
    it('should allow all roles (Owner, Admin, Developer, Viewer) to view flags', () => {
      expect(hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.VIEW_FLAGS)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.VIEW_FLAGS)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.VIEW_FLAGS)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.VIEW_FLAGS)).toBe(true);
    });
  });

  describe('Create Flags', () => {
    it('should allow Owner, Admin, and Developer, but deny Viewer', () => {
      expect(hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.CREATE_FLAGS)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.CREATE_FLAGS)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.CREATE_FLAGS)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.CREATE_FLAGS)).toBe(false);
    });
  });

  describe('Modify Flags', () => {
    it('should allow Owner, Admin, and Developer, but deny Viewer', () => {
      expect(hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.MODIFY_FLAGS)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.MODIFY_FLAGS)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.MODIFY_FLAGS)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.MODIFY_FLAGS)).toBe(false);
    });
  });

  describe('Rollback', () => {
    it('should allow Owner, Admin, and Developer, but deny Viewer', () => {
      expect(hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.ROLLBACK)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.ROLLBACK)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.ROLLBACK)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.ROLLBACK)).toBe(false);
    });
  });

  describe('Delete Project', () => {
    it('should ONLY allow Owner to delete projects, denying Admin, Developer, Viewer', () => {
      expect(hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.DELETE_PROJECT)).toBe(true);
      expect(hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.DELETE_PROJECT)).toBe(false);
      expect(hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.DELETE_PROJECT)).toBe(false);
      expect(hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.DELETE_PROJECT)).toBe(false);
    });
  });

  describe('Production Rollout Policy Checks', () => {
    it('should allow Owner and Admin unconditional production rollout', () => {
      expect(
        hasPermission(STANDARD_ROLES.OWNER, STANDARD_ACTIONS.PRODUCTION_ROLLOUT, {
          environmentType: 'PRODUCTION',
        }),
      ).toBe(true);
      expect(
        hasPermission(STANDARD_ROLES.ADMIN, STANDARD_ACTIONS.PRODUCTION_ROLLOUT, {
          environmentType: 'PRODUCTION',
        }),
      ).toBe(true);
    });

    it('should enforce POLICY for Developer on production rollouts', () => {
      // Non-production -> ALLOWED
      expect(
        hasPermission(STANDARD_ROLES.DEVELOPER, STANDARD_ACTIONS.PRODUCTION_ROLLOUT, {
          environmentType: 'DEVELOPMENT',
        }),
      ).toBe(true);

      // Production without policy override -> POLICY_REQUIRED (disallowed direct rollout)
      const prodResult = evaluatePermission(
        STANDARD_ROLES.DEVELOPER,
        STANDARD_ACTIONS.PRODUCTION_ROLLOUT,
        {
          environmentType: 'PRODUCTION',
          allowDeveloperProductionRollout: false,
        },
      );
      expect(prodResult.decision).toBe('POLICY_REQUIRED');
      expect(prodResult.allowed).toBe(false);

      // Production with policy override -> ALLOWED
      const overrideResult = evaluatePermission(
        STANDARD_ROLES.DEVELOPER,
        STANDARD_ACTIONS.PRODUCTION_ROLLOUT,
        {
          environmentType: 'PRODUCTION',
          allowDeveloperProductionRollout: true,
        },
      );
      expect(overrideResult.decision).toBe('ALLOW');
      expect(overrideResult.allowed).toBe(true);
    });

    it('should deny Viewer production rollout unconditionally', () => {
      expect(
        hasPermission(STANDARD_ROLES.VIEWER, STANDARD_ACTIONS.PRODUCTION_ROLLOUT, {
          environmentType: 'PRODUCTION',
          allowDeveloperProductionRollout: true,
        }),
      ).toBe(false);
    });
  });
});
