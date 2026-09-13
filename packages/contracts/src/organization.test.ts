import { describe, it, expect } from 'vitest';
import {
  OrganizationSchema,
  CreateOrganizationInputSchema,
  OrganizationIdSchema,
  OrganizationNameSchema,
} from './index.js';

describe('Organization Contract Schemas (Phase 1.1)', () => {
  const validOrg = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Acme Corporation',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('should accept valid Organization model', () => {
    const result = OrganizationSchema.safeParse(validOrg);
    expect(result.success).toBe(true);
    expect(OrganizationIdSchema.safeParse(validOrg.id).success).toBe(true);
  });

  it('should reject non-UUID organization id', () => {
    const invalid = { ...validOrg, id: 'not-a-uuid' };
    const result = OrganizationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty or whitespace-only organization name', () => {
    expect(OrganizationNameSchema.safeParse('').success).toBe(false);
    expect(OrganizationNameSchema.safeParse('   ').success).toBe(false);
  });

  it('should trim and accept valid organization name in CreateOrganizationInput', () => {
    const input = { name: '  Globex Corp  ' };
    const result = CreateOrganizationInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Globex Corp');
    }
  });

  it('should reject organization names longer than 255 characters', () => {
    const longName = 'a'.repeat(256);
    expect(OrganizationNameSchema.safeParse(longName).success).toBe(false);
  });

  it('should reject invalid createdAt / updatedAt datetime formats', () => {
    const invalidDates = { ...validOrg, createdAt: '2026/01/01' };
    expect(OrganizationSchema.safeParse(invalidDates).success).toBe(false);
  });
});
