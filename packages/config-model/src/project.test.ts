import { describe, it, expect, beforeEach } from 'vitest';
import { createProject, updateProject, InMemoryProjectRepository } from './index.js';

describe('Project Domain Model & Repository', () => {
  const orgId1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const orgId2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  describe('createProject factory helper', () => {
    it('creates a project with defaults and valid schema', () => {
      const project = createProject({
        organizationId: orgId1,
        name: 'Billing Gateway',
        key: 'billing-gateway',
      });

      expect(project.id).toBeDefined();
      expect(project.organizationId).toBe(orgId1);
      expect(project.name).toBe('Billing Gateway');
      expect(project.key).toBe('billing-gateway');
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBe(project.createdAt);
    });

    it('creates a project with explicit ID and timestamp', () => {
      const explicitId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
      const explicitTime = '2026-09-01T12:00:00.000Z';
      const project = createProject({
        id: explicitId,
        organizationId: orgId1,
        name: 'Auth Service',
        key: 'auth-svc',
        now: explicitTime,
      });

      expect(project.id).toBe(explicitId);
      expect(project.createdAt).toBe(explicitTime);
      expect(project.updatedAt).toBe(explicitTime);
    });

    it('rejects invalid inputs during creation', () => {
      expect(() =>
        createProject({
          organizationId: 'not-a-uuid',
          name: 'Invalid Org',
          key: 'valid-key',
        }),
      ).toThrow();

      expect(() =>
        createProject({
          organizationId: orgId1,
          name: '',
          key: 'valid-key',
        }),
      ).toThrow();

      expect(() =>
        createProject({
          organizationId: orgId1,
          name: 'Valid Name',
          key: 'INVALID_KEY',
        }),
      ).toThrow();
    });
  });

  describe('updateProject helper', () => {
    it('immutably updates project name and increments updatedAt', () => {
      const original = createProject({
        organizationId: orgId1,
        name: 'Original Name',
        key: 'orig-key',
        now: '2026-09-01T10:00:00.000Z',
      });

      const updatedTime = '2026-09-01T11:00:00.000Z';
      const updated = updateProject(original, { name: 'Updated Service Name' }, updatedTime);

      expect(updated.id).toBe(original.id);
      expect(updated.organizationId).toBe(original.organizationId);
      expect(updated.key).toBe(original.key);
      expect(updated.createdAt).toBe(original.createdAt);
      expect(updated.name).toBe('Updated Service Name');
      expect(updated.updatedAt).toBe(updatedTime);

      // Verify immutability
      expect(original.name).toBe('Original Name');
    });
  });

  describe('InMemoryProjectRepository', () => {
    let repo: InMemoryProjectRepository;

    beforeEach(() => {
      repo = new InMemoryProjectRepository();
    });

    it('creates, retrieves, and lists projects by organization', async () => {
      const p1 = await repo.create({
        organizationId: orgId1,
        name: 'Service A',
        key: 'service-a',
      });
      const p2 = await repo.create({
        organizationId: orgId1,
        name: 'Service B',
        key: 'service-b',
      });
      const p3 = await repo.create({
        organizationId: orgId2,
        name: 'Other Org Service',
        key: 'other-service',
      });

      expect(await repo.findById(p1.id)).toEqual(p1);
      expect(await repo.findByKey(orgId1, 'service-a')).toEqual(p1);

      const org1Projects = await repo.listByOrganization(orgId1);
      expect(org1Projects).toHaveLength(2);
      expect(org1Projects.map((p) => p.id)).toContain(p1.id);
      expect(org1Projects.map((p) => p.id)).toContain(p2.id);

      const org2Projects = await repo.listByOrganization(orgId2);
      expect(org2Projects).toHaveLength(1);
      expect(org2Projects[0]?.id).toBe(p3.id);
    });

    it('enforces project key uniqueness within the same organization', async () => {
      await repo.create({
        organizationId: orgId1,
        name: 'Service Alpha',
        key: 'service-alpha',
      });

      await expect(
        repo.create({
          organizationId: orgId1,
          name: 'Duplicate Alpha',
          key: 'service-alpha',
        }),
      ).rejects.toThrow(/already exists in organization/);
    });

    it('allows same project key across different organizations', async () => {
      const p1 = await repo.create({
        organizationId: orgId1,
        name: 'Common Service',
        key: 'common-service',
      });

      const p2 = await repo.create({
        organizationId: orgId2,
        name: 'Common Service Org 2',
        key: 'common-service',
      });

      expect(p1.key).toBe(p2.key);
      expect(p1.organizationId).not.toBe(p2.organizationId);
      expect(await repo.findByKey(orgId1, 'common-service')).toEqual(p1);
      expect(await repo.findByKey(orgId2, 'common-service')).toEqual(p2);
    });

    it('enforces global project ID uniqueness', async () => {
      const explicitId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
      await repo.create(
        {
          organizationId: orgId1,
          name: 'App 1',
          key: 'app-one',
        },
        explicitId,
      );

      await expect(
        repo.create(
          {
            organizationId: orgId2,
            name: 'App 2',
            key: 'app-two',
          },
          explicitId,
        ),
      ).rejects.toThrow(/already exists/);
    });

    it('updates and deletes projects', async () => {
      const project = await repo.create({
        organizationId: orgId1,
        name: 'Old Name',
        key: 'my-project',
      });

      const updated = await repo.update(project.id, { name: 'New Name' });
      expect(updated.name).toBe('New Name');

      const deleted = await repo.delete(project.id);
      expect(deleted).toBe(true);
      expect(await repo.findById(project.id)).toBeNull();
      expect(await repo.findByKey(orgId1, 'my-project')).toBeNull();
    });
  });
});
