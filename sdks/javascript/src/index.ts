import type { EvaluationContext } from '@controlplane/contracts';
import type { ConfigurationSnapshot } from '@controlplane/config-model';
import { evaluateFlag } from '@controlplane/evaluation-engine';
import { ConfigurationStore } from '@controlplane/config-client';

export interface ControlPlaneOptions {
  apiKey: string;
  endpoint?: string;
  initialSnapshot?: ConfigurationSnapshot;
}

export class ControlPlane {
  private configStore = new ConfigurationStore();
  readonly options: ControlPlaneOptions;

  private constructor(options: ControlPlaneOptions) {
    this.options = options;
    if (options.initialSnapshot) {
      this.configStore.setSnapshot(options.initialSnapshot);
    }
  }

  static async initialize(options: ControlPlaneOptions): Promise<ControlPlane> {
    return new ControlPlane(options);
  }

  isEnabled(flagKey: string, context: EvaluationContext = {}, defaultValue = false): boolean {
    const snapshot = this.configStore.getSnapshot();
    if (!snapshot) {
      return defaultValue;
    }
    const result = evaluateFlag({
      snapshot,
      flagKey,
      context,
      defaultValue,
    });
    return Boolean(result.value);
  }
}
