import { describe, it, expect } from 'vitest';
import {
  ProjectSchema,
  ProjectIdSchema,
  ProjectKeySchema,
  createProject,
  InMemoryProjectRepository,
} from '@controlplane/config-model';

describe('Phase 1.2 Milestone Contract — Project', () => {
  const orgIdA = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const orgIdB = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';

  it('adheres to the exact Project model specification', () => {
    const project = createProject({
      organizationId: orgIdA,
      name: 'E-Commerce Core',
      key: 'ecommerce-core',
    });

    const parsed = ProjectSchema.parse(project);
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('organizationId', orgIdA);
    expect(parsed).toHaveProperty('name', 'E-Commerce Core');
    expect(parsed).toHaveProperty('key', 'ecommerce-core');
    expect(parsed).toHaveProperty('createdAt');
    expect(parsed).toHaveProperty('updatedAt');

    expect(ProjectIdSchema.safeParse(parsed.id).success).toBe(true);
    expect(ProjectKeySchema.safeParse(parsed.key).success).toBe(true);
  });

  it('guarantees key stability and validation rules', () => {
    // Valid project slugs
    expect(ProjectKeySchema.safeParse('frontend').success).toBe(true);
    expect(ProjectKeySchema.safeParse('mobile-checkout-v2').success).toBe(true);

    // Invalid project slugs
    expect(ProjectKeySchema.safeParse('Frontend_App').success).toBe(false);
    expect(ProjectKeySchema.safeParse('-bad-slug').success).toBe(false);
  });

  it('enforces multi-project relationship under an organization and scoped key uniqueness', async () => {
    const repo = new InMemoryProjectRepository();

    // Organization A owns Project 1 & Project 2
    const p1 = await repo.create({
      organizationId: orgIdA,
      name: 'Project Alpha',
      key: 'project-alpha',
    });
    const p2 = await repo.create({
      organizationId: orgIdA,
      name: 'Project Beta',
      key: 'project-beta',
    });

    expect(p1.id).toBeDefined();
    expect(p2.id).toBeDefined();

    const orgAProjects = await repo.listByOrganization(orgIdA);
    expect(orgAProjects).toHaveLength(2);
    expect(orgAProjects.map((p) => p.key)).toEqual(
      expect.arrayContaining(['project-alpha', 'project-beta']),
    );

    // Duplicate key in Org A must be rejected
    await expect(
      repo.create({
        organizationId: orgIdA,
        name: 'Project Alpha Duplicate',
        key: 'project-alpha',
      }),
    ).rejects.toThrow();

    // Same key in Org B must be accepted
    const pOrgB = await repo.create({
      organizationId: orgIdB,
      name: 'Project Alpha for Org B',
      key: 'project-alpha',
    });
    expect(pOrgB.key).toBe('project-alpha');
    expect(pOrgB.organizationId).toBe(orgIdB);
  });
});
