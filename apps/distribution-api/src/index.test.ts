import { describe, it, expect } from 'vitest';
import { getDistributionApiInfo } from './index.js';

describe('Distribution API Service Skeleton', () => {
  it('should return distribution capabilities', () => {
    const info = getDistributionApiInfo();
    expect(info.name).toBe('controlplane-distribution-api');
    expect(info.supportsETag).toBe(true);
  });
});
