import { describe, it, expect } from 'vitest';
import { ControlPlane } from './index.js';

describe('Node SDK Skeleton', () => {
  it('should export ControlPlane client', () => {
    expect(ControlPlane).toBeDefined();
  });
});
