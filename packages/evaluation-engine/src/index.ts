import type { EvaluationContext, EvaluationResult } from '@controlplane/contracts';
import type { ConfigurationSnapshot } from '@controlplane/config-model';

export interface EvaluationOptions {
  snapshot: ConfigurationSnapshot;
  flagKey: string;
  context: EvaluationContext;
  defaultValue?: boolean | string | number | Record<string, unknown>;
}

export function evaluateFlag(options: EvaluationOptions): EvaluationResult {
  const { snapshot, flagKey, defaultValue = false } = options;
  const flag = snapshot.flags.find((f) => f.key === flagKey);

  if (!flag) {
    return {
      flagKey,
      value: defaultValue,
      reason: 'UNKNOWN_FLAG',
      configurationVersion: snapshot.configurationVersion,
    };
  }

  if (!flag.enabled) {
    return {
      flagKey,
      value: flag.defaultValue,
      reason: 'FLAG_DISABLED',
      configurationVersion: snapshot.configurationVersion,
    };
  }

  return {
    flagKey,
    value: flag.defaultValue,
    reason: 'DEFAULT',
    configurationVersion: snapshot.configurationVersion,
  };
}
