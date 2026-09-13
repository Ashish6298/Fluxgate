import { describe, it, expect } from 'vitest';
import { ControlPlane } from '@controlplane/sdk';

describe('End-to-End Local Evaluation Integration', () => {
  it('should initialize SDK and evaluate flags in-memory without remote calls', async () => {
    const cp = await ControlPlane.initialize({
      apiKey: 'test_sdk_key',
      initialSnapshot: {
        schemaVersion: 1,
        projectKey: 'web-portal',
        environmentKey: 'staging',
        configurationVersion: 10,
        checksum: 'checksum_integration_test',
        flags: [
          {
            id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
            environmentId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
            key: 'beta_dashboard',
            name: 'Beta Dashboard Layout',
            type: 'BOOLEAN',
            defaultValue: true,
            enabled: true,
            rules: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    });

    const isBeta = cp.isEnabled('beta_dashboard');
    expect(isBeta).toBe(true);

    const isUnknown = cp.isEnabled('non_existent_flag', {}, false);
    expect(isUnknown).toBe(false);
  });
});
