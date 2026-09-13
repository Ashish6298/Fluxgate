import { describe, it, expect } from 'vitest';
import { isUserInRollout } from './index.js';

describe('Rollout Engine Package', () => {
  it('should handle 0% and 100% boundary conditions', () => {
    const base = {
      projectKey: 'app',
      environmentKey: 'prod',
      flagKey: 'flag_x',
      userIdentifier: 'user_1',
    };

    expect(isUserInRollout({ ...base, percentage: 0 }).inRollout).toBe(false);
    expect(isUserInRollout({ ...base, percentage: 100 }).inRollout).toBe(true);
  });

  it('should maintain rollout stability as percentage increases', () => {
    const base = {
      projectKey: 'app',
      environmentKey: 'prod',
      flagKey: 'flag_x',
      userIdentifier: 'user_stabilized',
    };

    const res5 = isUserInRollout({ ...base, percentage: 5 });
    if (res5.inRollout) {
      const res10 = isUserInRollout({ ...base, percentage: 10 });
      const res50 = isUserInRollout({ ...base, percentage: 50 });
      expect(res10.inRollout).toBe(true);
      expect(res50.inRollout).toBe(true);
    }
  });
});
