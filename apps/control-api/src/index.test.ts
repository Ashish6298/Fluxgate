import { describe, it, expect } from 'vitest';
import { getControlApiInfo } from './index.js';

describe('Control API Service Skeleton', () => {
  it('should return service metadata', () => {
    const info = getControlApiInfo();
    expect(info.name).toBe('controlplane-control-api');
    expect(info.status).toBe('operational');
  });
});
