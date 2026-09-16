import * as crypto from 'node:crypto';
import type {
  AuditEvent,
  ConfigurationSnapshot,
  ConfigurationVersion,
  FeatureFlag,
  TargetingRule,
  Rollout,
  SnapshotFlag,
} from '@controlplane/contracts';

/**
 * Unit of Work context passed to transactional operations
 */
export interface TransactionalContext {
  id: string;
  timestamp: string;
  execute<T>(action: () => Promise<T>): Promise<T>;
  rollback(): Promise<void>;
  commit(): Promise<void>;
  isCompleted(): boolean;
  isRolledBack(): boolean;
}

/**
 * Result of atomic flag mutation and snapshot versioning
 */
export interface AtomicFlagUpdateResult {
  updatedFlag: FeatureFlag;
  targetingRules: TargetingRule[];
  rollout?: Rollout;
  snapshot: ConfigurationSnapshot;
  configurationVersion: ConfigurationVersion;
  auditEvent: AuditEvent;
}

/**
 * Input parameters for atomic flag mutation
 */
export interface AtomicFlagUpdateParams {
  organizationId: string;
  projectKey: string;
  environmentKey: string;
  actorId: string;
  reason?: string;
  flag: FeatureFlag;
  targetingRules: TargetingRule[];
  rollout?: Rollout;
  allEnvironmentFlags: FeatureFlag[];
  allEnvironmentRules: TargetingRule[];
  allEnvironmentRollouts: Rollout[];
  currentVersionNumber: number;
}

/**
 * In-memory Transaction Manager implementing Atomic Unit-of-Work
 */
export class TransactionManager {
  private activeTransactions = new Map<
    string,
    { status: 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK' }
  >();

  /**
   * Run operations inside an atomic transaction boundary (All-or-Nothing)
   */
  public async runTransaction<T>(operation: (ctx: TransactionalContext) => Promise<T>): Promise<T> {
    const txId = crypto.randomUUID();
    let status: 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK' = 'ACTIVE';
    this.activeTransactions.set(txId, { status });

    const rollbackHooks: Array<() => Promise<void>> = [];

    const ctx: TransactionalContext = {
      id: txId,
      timestamp: new Date().toISOString(),
      execute: async <R>(action: () => Promise<R>): Promise<R> => {
        if (status !== 'ACTIVE') {
          throw new Error(`Cannot execute action on transaction ${txId} with status ${status}`);
        }
        return await action();
      },
      rollback: async () => {
        if (status === 'ROLLED_BACK') return;
        status = 'ROLLED_BACK';
        this.activeTransactions.set(txId, { status });
        for (const hook of rollbackHooks.reverse()) {
          await hook();
        }
      },
      commit: async () => {
        if (status !== 'ACTIVE') {
          throw new Error(`Cannot commit transaction ${txId} with status ${status}`);
        }
        status = 'COMMITTED';
        this.activeTransactions.set(txId, { status });
      },
      isCompleted: () => status === 'COMMITTED',
      isRolledBack: () => status === 'ROLLED_BACK',
    };

    try {
      const result = await operation(ctx);
      await ctx.commit();
      return result;
    } catch (error) {
      await ctx.rollback();
      throw error;
    }
  }

  /**
   * Performs atomic flag update + snapshot generation + version creation + audit event logging
   * Invariant: Complete Success OR Complete Rollback
   */
  public async executeAtomicFlagUpdate(
    params: AtomicFlagUpdateParams,
    failStep?: 'UPDATE_FLAG' | 'GENERATE_SNAPSHOT' | 'CREATE_VERSION' | 'CREATE_AUDIT_EVENT',
  ): Promise<AtomicFlagUpdateResult> {
    return await this.runTransaction(async (ctx) => {
      // Step 1: Update Flag
      if (failStep === 'UPDATE_FLAG') {
        throw new Error('Simulated failure during Step 1: Update Flag');
      }
      const updatedFlag: FeatureFlag = {
        ...params.flag,
        updatedAt: ctx.timestamp,
      };

      // Step 2: Generate Snapshot
      if (failStep === 'GENERATE_SNAPSHOT') {
        throw new Error('Simulated failure during Step 2: Generate Snapshot');
      }

      // Merge updated flag into environment flag set
      const updatedFlags = params.allEnvironmentFlags.map((f) =>
        f.id === updatedFlag.id ? updatedFlag : f,
      );
      if (!updatedFlags.some((f) => f.id === updatedFlag.id)) {
        updatedFlags.push(updatedFlag);
      }

      const snapshotFlags: SnapshotFlag[] = updatedFlags.map((f) => {
        const flagRules = params.allEnvironmentRules.filter((r) => r.featureFlagId === f.id);
        const flagRollout = params.allEnvironmentRollouts.find((r) => r.featureFlagId === f.id);
        return {
          ...f,
          rules: flagRules,
          rollout: flagRollout,
        };
      });

      const nextVersion = params.currentVersionNumber + 1;

      // Pre-calculate checksum on canonical content
      const basePayload = {
        schemaVersion: 1,
        projectKey: params.projectKey,
        environmentKey: params.environmentKey,
        configurationVersion: nextVersion,
        flags: snapshotFlags,
      };
      const checksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(basePayload))
        .digest('hex');

      const snapshot: ConfigurationSnapshot = {
        ...basePayload,
        checksum,
      };

      // Step 3: Create Version
      if (failStep === 'CREATE_VERSION') {
        throw new Error('Simulated failure during Step 3: Create Version');
      }

      const configurationVersion: ConfigurationVersion = {
        id: crypto.randomUUID(),
        environmentId: params.flag.environmentId,
        version: snapshot.configurationVersion,
        snapshot: snapshot as unknown as Record<string, unknown>,
        checksum,
        createdBy: params.actorId,
        reason: params.reason ?? `Updated flag ${params.flag.key}`,
        createdAt: ctx.timestamp,
      };

      // Step 4: Create Audit Event
      if (failStep === 'CREATE_AUDIT_EVENT') {
        throw new Error('Simulated failure during Step 4: Create Audit Event');
      }

      const auditEvent: AuditEvent = {
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: 'FEATURE_FLAG_UPDATED',
        resourceType: 'FEATURE_FLAG',
        resourceId: params.flag.id,
        before: { flag: params.flag },
        after: {
          flag: updatedFlag,
          version: configurationVersion.version,
          checksum: configurationVersion.checksum,
        },
        createdAt: ctx.timestamp,
      };

      return {
        updatedFlag,
        targetingRules: params.targetingRules,
        rollout: params.rollout,
        snapshot,
        configurationVersion,
        auditEvent,
      };
    });
  }
}
