import { describe, it, expect } from 'vitest';
import { createOrganization, updateOrganization, InMemoryOrganizationRepository } from './index.js';

describe('Organization Domain Model & Repository (Phase 1.1)', () => {
  it('should create a valid organization with generated UUID and timestamps', () => {
    const org = createOrganization({ name: 'Stark Industries' });

    expect(org.id).toBeDefined();
    expect(org.name).toBe('Stark Industries');
    expect(new Date(org.createdAt).toISOString()).toBe(org.createdAt);
    expect(org.createdAt).toBe(org.updatedAt);
  });

  it('should accept custom valid UUID and custom timestamp', () => {
    const customId = '550e8400-e29b-41d4-a716-446655440000';
    const timestamp = '2026-03-01T10:00:00.000Z';
    const org = createOrganization({
      id: customId,
      name: 'Wayne Enterprises',
      now: timestamp,
    });

    expect(org.id).toBe(customId);
    expect(org.name).toBe('Wayne Enterprises');
    expect(org.createdAt).toBe(timestamp);
    expect(org.updatedAt).toBe(timestamp);
  });

  it('should reject invalid creation parameters', () => {
    expect(() => createOrganization({ name: '' })).toThrow();
    expect(() => createOrganization({ name: '   ' })).toThrow();
    expect(() => createOrganization({ name: 'Valid Name', id: 'invalid-uuid-format' })).toThrow();
  });

  it('should update organization name immutably and update timestamp', () => {
    const org1 = createOrganization({
      name: 'Old Name',
      now: '2026-01-01T00:00:00.000Z',
    });

    const updated = updateOrganization(org1, { name: 'New Name' }, '2026-01-02T12:00:00.000Z');

    expect(updated.name).toBe('New Name');
    expect(updated.id).toBe(org1.id);
    expect(updated.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(updated.updatedAt).toBe('2026-01-02T12:00:00.000Z');

    // Original object must remain unmodified
    expect(org1.name).toBe('Old Name');
  });

  describe('InMemoryOrganizationRepository Uniqueness & CRUD', () => {
    it('should create and retrieve organizations by ID', async () => {
      const repo = new InMemoryOrganizationRepository();
      const org = await repo.create({ name: 'Umbrella Corp' });

      const fetched = await repo.findById(org.id);
      expect(fetched).toEqual(org);
    });

    it('should enforce identifier uniqueness and reject duplicate IDs', async () => {
      const repo = new InMemoryOrganizationRepository();
      const customId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

      await repo.create({ name: 'Org A' }, customId);
      await expect(repo.create({ name: 'Org B' }, customId)).rejects.toThrow(
        `Organization with ID '${customId}' already exists`,
      );
    });

    it('should list all registered organizations', async () => {
      const repo = new InMemoryOrganizationRepository();
      await repo.create({ name: 'Tenant 1' });
      await repo.create({ name: 'Tenant 2' });

      const all = await repo.list();
      expect(all.length).toBe(2);
      expect(all.map((o) => o.name)).toContain('Tenant 1');
      expect(all.map((o) => o.name)).toContain('Tenant 2');
    });

    it('should update existing organization', async () => {
      const repo = new InMemoryOrganizationRepository();
      const org = await repo.create({ name: 'Initial Name' });

      const updated = await repo.update(org.id, { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');

      const fetched = await repo.findById(org.id);
      expect(fetched?.name).toBe('Updated Name');
    });

    it('should delete organization', async () => {
      const repo = new InMemoryOrganizationRepository();
      const org = await repo.create({ name: 'To Delete' });

      const deleted = await repo.delete(org.id);
      expect(deleted).toBe(true);
      expect(await repo.findById(org.id)).toBeNull();
    });
  });
});
