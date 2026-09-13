import { describe, it, expect } from 'vitest';
import {
  EnvironmentSchema,
  EnvironmentIdSchema,
  EnvironmentKeySchema,
  EnvironmentTypeSchema,
  createEnvironment,
  InMemoryEnvironmentRepository,
} from '@controlplane/config-model';

describe('Phase 1.3 Milestone Contract — Environment', () => {
  const projectIdA = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const projectIdB = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';

  it('adheres to the exact Environment model specification', () => {
    const env = createEnvironment({
      projectId: projectIdA,
      name: 'Production',
      key: 'production',
      type: 'PRODUCTION',
    });

    const parsed = EnvironmentSchema.parse(env);
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('projectId', projectIdA);
    expect(parsed).toHaveProperty('name', 'Production');
    expect(parsed).toHaveProperty('key', 'production');
    expect(parsed).toHaveProperty('type', 'PRODUCTION');
    expect(parsed).toHaveProperty('createdAt');
    expect(parsed).toHaveProperty('updatedAt');

    expect(EnvironmentIdSchema.safeParse(parsed.id).success).toBe(true);
    expect(EnvironmentKeySchema.safeParse(parsed.key).success).toBe(true);
    expect(EnvironmentTypeSchema.safeParse(parsed.type).success).toBe(true);
  });

  it('guarantees environment hierarchy (Development, Staging, Production) and key uniqueness per project', async () => {
    const repo = new InMemoryEnvironmentRepository();

    const dev = await repo.create({
      projectId: projectIdA,
      name: 'Development',
      key: 'development',
      type: 'DEVELOPMENT',
    });
    const staging = await repo.create({
      projectId: projectIdA,
      name: 'Staging',
      key: 'staging',
      type: 'STAGING',
    });
    const prod = await repo.create({
      projectId: projectIdA,
      name: 'Production',
      key: 'production',
      type: 'PRODUCTION',
    });

    expect(dev.id).toBeDefined();
    expect(staging.id).toBeDefined();
    expect(prod.id).toBeDefined();

    const projectAEnvs = await repo.listByProject(projectIdA);
    expect(projectAEnvs).toHaveLength(3);
    expect(projectAEnvs.map((e) => e.key)).toEqual(
      expect.arrayContaining(['development', 'staging', 'production']),
    );

    // Duplicate key in same project must be rejected
    await expect(
      repo.create({
        projectId: projectIdA,
        name: 'Development Duplicate',
        key: 'development',
        type: 'DEVELOPMENT',
      }),
    ).rejects.toThrow();

    // Same key in Project B must be accepted
    const projectBDev = await repo.create({
      projectId: projectIdB,
      name: 'Development for Project B',
      key: 'development',
      type: 'DEVELOPMENT',
    });
    expect(projectBDev.key).toBe('development');
    expect(projectBDev.projectId).toBe(projectIdB);
  });

  it('enforces environment isolation invariant (changes in one environment do not mutate others)', async () => {
    const repo = new InMemoryEnvironmentRepository();

    const dev = await repo.create({
      projectId: projectIdA,
      name: 'Development',
      key: 'development',
      type: 'DEVELOPMENT',
    });
    const prod = await repo.create({
      projectId: projectIdA,
      name: 'Production',
      key: 'production',
      type: 'PRODUCTION',
    });

    // Mutating Development
    const updatedDev = await repo.update(dev.id, { name: 'Development Cluster V2' });
    expect(updatedDev.name).toBe('Development Cluster V2');

    // Verify Production is completely unaffected
    const unchangedProd = await repo.findById(prod.id);
    expect(unchangedProd?.name).toBe('Production');
    expect(unchangedProd?.updatedAt).toBe(prod.updatedAt);
  });
});
