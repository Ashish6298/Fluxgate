import { describe, it, expect } from 'vitest';
import { ConfigurationStore } from './index.js';

describe('Config Client Package', () => {
  it('should store and retrieve last known good configuration', async () => {
    const store = new ConfigurationStore();
    const snapshot = {
      schemaVersion: 1,
      projectKey: 'app',
      environmentKey: 'prod',
      configurationVersion: 1,
      checksum: 'chk_1',
      flags: [],
    };

    await store.setSnapshot(snapshot);
    expect(store.getSnapshot()?.configurationVersion).toBe(1);
  });
});
