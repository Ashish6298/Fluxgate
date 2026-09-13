import type { ConfigurationSnapshot } from '@controlplane/config-model';

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

export class ConfigurationStore {
  private lastKnownGood: ConfigurationSnapshot | null = null;

  constructor(private storage: StorageAdapter = new InMemoryStorageAdapter()) {}

  async setSnapshot(snapshot: ConfigurationSnapshot): Promise<void> {
    this.lastKnownGood = snapshot;
    await this.storage.set('cp_lkg_config', JSON.stringify(snapshot));
  }

  getSnapshot(): ConfigurationSnapshot | null {
    return this.lastKnownGood;
  }
}
