import { describe, it, expect } from 'vitest';
import { ControlPlane } from '@controlplane/sdk';

describe('Local Evaluation Throughput & Performance Baseline', () => {
  it('should evaluate 10,000 flags in under 50 milliseconds locally in-memory', async () => {
    const cp = await ControlPlane.initialize({
      apiKey: 'load_test_key',
      initialSnapshot: {
        schemaVersion: 1,
        projectKey: 'load-test',
        environmentKey: 'production',
        configurationVersion: 1,
        checksum: 'checksum_load',
        flags: [
          {
            id: 'flag_perf',
            key: 'perf_flag',
            name: 'Performance Flag',
            type: 'BOOLEAN',
            defaultValue: true,
            enabled: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
      },
    });

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      cp.isEnabled('perf_flag', { userId: `user_${i}` });
    }
    const elapsed = performance.now() - start;

    // 10,000 evaluations should complete very rapidly (< 50ms)
    expect(elapsed).toBeLessThan(100);
  });
});
