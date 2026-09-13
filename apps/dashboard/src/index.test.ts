import { describe, it, expect } from 'vitest';
import { getDashboardMetadata } from './index.js';

describe('Management Dashboard Skeleton', () => {
  it('should return metadata and required management sections', () => {
    const meta = getDashboardMetadata();
    expect(meta.title).toBe('CONTROLPLANE Management Dashboard');
    expect(meta.sections).toContain('flags');
    expect(meta.sections).toContain('audit');
    expect(meta.sections).toContain('versions');
  });
});
