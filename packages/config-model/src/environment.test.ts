import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironment, updateEnvironment, InMemoryEnvironmentRepository } from './index.js';

describe('Environment Domain Model & Repository', () => {
  const projectId1 = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const projectId2 = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  describe('createEnvironment factory helper', () => {
    it('creates an environment with valid schema and default type', () => {
      const env = createEnvironment({
        projectId: projectId1,
        name: 'Development Sandbox',
        key: 'development',
      });

      expect(env.id).toBeDefined();
      expect(env.projectId).toBe(projectId1);
      expect(env.name).toBe('Development Sandbox');
      expect(env.key).toBe('development');
      expect(env.type).toBe('CUSTOM');
      expect(env.createdAt).toBeDefined();
      expect(env.updatedAt).toBe(env.createdAt);
    });

    it('creates an environment with explicit type, ID, and timestamp', () => {
      const explicitId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
      const explicitTime = '2026-09-01T12:00:00.000Z';
      const env = createEnvironment({
        id: explicitId,
        projectId: projectId1,
        name: 'Production Cluster',
        key: 'production',
        type: 'PRODUCTION',
        now: explicitTime,
      });

      expect(env.id).toBe(explicitId);
      expect(env.type).toBe('PRODUCTION');
      expect(env.createdAt).toBe(explicitTime);
      expect(env.updatedAt).toBe(explicitTime);
    });

    it('rejects invalid inputs during creation', () => {
      expect(() =>
        createEnvironment({
          projectId: 'not-a-uuid',
          name: 'Invalid Project',
          key: 'valid-key',
        }),
      ).toThrow();

      expect(() =>
        createEnvironment({
          projectId: projectId1,
          name: '',
          key: 'valid-key',
        }),
      ).toThrow();

      expect(() =>
        createEnvironment({
          projectId: projectId1,
          name: 'Valid Name',
          key: 'INVALID_SLUG',
        }),
      ).toThrow();
    });
  });

  describe('updateEnvironment helper', () => {
    it('immutably updates environment name/type and increments updatedAt', () => {
      const original = createEnvironment({
        projectId: projectId1,
        name: 'Dev',
        key: 'dev',
        type: 'DEVELOPMENT',
        now: '2026-09-01T10:00:00.000Z',
      });

      const updatedTime = '2026-09-01T11:00:00.000Z';
      const updated = updateEnvironment(
        original,
        { name: 'Dev Staging Hybrid', type: 'STAGING' },
        updatedTime,
      );

      expect(updated.id).toBe(original.id);
      expect(updated.projectId).toBe(original.projectId);
      expect(updated.key).toBe(original.key);
      expect(updated.createdAt).toBe(original.createdAt);
      expect(updated.name).toBe('Dev Staging Hybrid');
      expect(updated.type).toBe('STAGING');
      expect(updated.updatedAt).toBe(updatedTime);

      // Verify immutability of original
      expect(original.name).toBe('Dev');
      expect(original.type).toBe('DEVELOPMENT');
    });
  });

  describe('InMemoryEnvironmentRepository', () => {
    let repo: InMemoryEnvironmentRepository;

    beforeEach(() => {
      repo = new InMemoryEnvironmentRepository();
    });

    it('creates, retrieves, and lists environments by project', async () => {
      const dev = await repo.create({
        projectId: projectId1,
        name: 'Development',
        key: 'development',
        type: 'DEVELOPMENT',
      });
      const prod = await repo.create({
        projectId: projectId1,
        name: 'Production',
        key: 'production',
        type: 'PRODUCTION',
      });
      const otherProjectEnv = await repo.create({
        projectId: projectId2,
        name: 'Production',
        key: 'production',
        type: 'PRODUCTION',
      });

      expect(await repo.findById(dev.id)).toEqual(dev);
      expect(await repo.findByKey(projectId1, 'development')).toEqual(dev);

      const proj1Envs = await repo.listByProject(projectId1);
      expect(proj1Envs).toHaveLength(2);
      expect(proj1Envs.map((e) => e.id)).toContain(dev.id);
      expect(proj1Envs.map((e) => e.id)).toContain(prod.id);

      const proj2Envs = await repo.listByProject(projectId2);
      expect(proj2Envs).toHaveLength(1);
      expect(proj2Envs[0]?.id).toBe(otherProjectEnv.id);
    });

    it('enforces environment key uniqueness within the same project', async () => {
      await repo.create({
        projectId: projectId1,
        name: 'Staging',
        key: 'staging',
        type: 'STAGING',
      });

      await expect(
        repo.create({
          projectId: projectId1,
          name: 'Staging 2 Duplicate',
          key: 'staging',
          type: 'STAGING',
        }),
      ).rejects.toThrow(/already exists in project/);
    });

    it('allows same environment key across different projects', async () => {
      const e1 = await repo.create({
        projectId: projectId1,
        name: 'Staging',
        key: 'staging',
        type: 'STAGING',
      });

      const e2 = await repo.create({
        projectId: projectId2,
        name: 'Staging',
        key: 'staging',
        type: 'STAGING',
      });

      expect(e1.key).toBe(e2.key);
      expect(e1.projectId).not.toBe(e2.projectId);
      expect(await repo.findByKey(projectId1, 'staging')).toEqual(e1);
      expect(await repo.findByKey(projectId2, 'staging')).toEqual(e2);
    });

    it('enforces global environment ID uniqueness', async () => {
      const explicitId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
      await repo.create(
        {
          projectId: projectId1,
          name: 'Env 1',
          key: 'env-one',
        },
        explicitId,
      );

      await expect(
        repo.create(
          {
            projectId: projectId2,
            name: 'Env 2',
            key: 'env-two',
          },
          explicitId,
        ),
      ).rejects.toThrow(/already exists/);
    });

    it('updates and deletes environments', async () => {
      const env = await repo.create({
        projectId: projectId1,
        name: 'Old Dev',
        key: 'dev',
        type: 'DEVELOPMENT',
      });

      const updated = await repo.update(env.id, { name: 'New Dev' });
      expect(updated.name).toBe('New Dev');

      const deleted = await repo.delete(env.id);
      expect(deleted).toBe(true);
      expect(await repo.findById(env.id)).toBeNull();
      expect(await repo.findByKey(projectId1, 'dev')).toBeNull();
    });
  });
});
