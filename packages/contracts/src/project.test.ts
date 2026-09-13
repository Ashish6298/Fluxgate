import { describe, it, expect } from 'vitest';
import {
  ProjectIdSchema,
  ProjectKeySchema,
  ProjectNameSchema,
  ProjectSchema,
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
} from './index.js';

describe('Project Contracts & Validation', () => {
  const validOrgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const validProjectId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  it('validates a valid Project entity schema', () => {
    const validProject = {
      id: validProjectId,
      organizationId: validOrgId,
      name: 'Mobile Checkout Service',
      key: 'mobile-checkout',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = ProjectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('validates project keys with lowercase kebab-case rules', () => {
    const validKeys = ['api', 'web-app', 'service-v2', 'order-processing-svc-99'];
    for (const key of validKeys) {
      expect(ProjectKeySchema.safeParse(key).success).toBe(true);
    }

    const invalidKeys = [
      'a', // too short (< 2 chars)
      'A'.repeat(64), // too long (> 63 chars)
      'WebApp', // uppercase not allowed
      'web_app', // underscore not allowed in standard slug
      '-web-app', // leading hyphen
      'web-app-', // trailing hyphen
      'web--app', // consecutive hyphens
      'web app', // spaces
    ];
    for (const key of invalidKeys) {
      expect(ProjectKeySchema.safeParse(key).success).toBe(false);
    }
  });

  it('validates project ID and organization ID as valid UUIDs', () => {
    expect(ProjectIdSchema.safeParse(validProjectId).success).toBe(true);
    expect(ProjectIdSchema.safeParse('not-a-uuid').success).toBe(false);

    const invalidProject = {
      id: 'invalid-id',
      organizationId: 'invalid-org-id',
      name: 'Test Project',
      key: 'test-project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(ProjectSchema.safeParse(invalidProject).success).toBe(false);
  });

  it('validates and trims project name', () => {
    expect(ProjectNameSchema.safeParse('  Mobile App  ').data).toBe('Mobile App');
    expect(ProjectNameSchema.safeParse('').success).toBe(false);
    expect(ProjectNameSchema.safeParse('   ').success).toBe(false);
    expect(ProjectNameSchema.safeParse('x'.repeat(256)).success).toBe(false);
  });

  it('validates CreateProjectInputSchema and UpdateProjectInputSchema', () => {
    const createInput = {
      organizationId: validOrgId,
      name: 'Analytics Service',
      key: 'analytics-svc',
    };
    expect(CreateProjectInputSchema.safeParse(createInput).success).toBe(true);

    const updateInput = {
      name: 'Analytics Pipeline Service',
    };
    expect(UpdateProjectInputSchema.safeParse(updateInput).success).toBe(true);
  });
});
