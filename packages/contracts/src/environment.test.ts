import { describe, it, expect } from 'vitest';
import {
  EnvironmentIdSchema,
  EnvironmentKeySchema,
  EnvironmentNameSchema,
  EnvironmentTypeSchema,
  EnvironmentSchema,
  CreateEnvironmentInputSchema,
  UpdateEnvironmentInputSchema,
} from './index.js';

describe('Environment Contracts & Validation', () => {
  const validProjectId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const validEnvId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  it('validates a valid Environment entity schema', () => {
    const validEnv = {
      id: validEnvId,
      projectId: validProjectId,
      name: 'Production US-East',
      key: 'production',
      type: 'PRODUCTION',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = EnvironmentSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it('validates environment types enum', () => {
    expect(EnvironmentTypeSchema.safeParse('DEVELOPMENT').success).toBe(true);
    expect(EnvironmentTypeSchema.safeParse('STAGING').success).toBe(true);
    expect(EnvironmentTypeSchema.safeParse('PRODUCTION').success).toBe(true);
    expect(EnvironmentTypeSchema.safeParse('CUSTOM').success).toBe(true);

    expect(EnvironmentTypeSchema.safeParse('LOCAL').success).toBe(false);
    expect(EnvironmentTypeSchema.safeParse('dev').success).toBe(false);
  });

  it('validates environment keys with slug constraints', () => {
    const validKeys = ['development', 'staging', 'production', 'qa-1', 'perf-test'];
    for (const key of validKeys) {
      expect(EnvironmentKeySchema.safeParse(key).success).toBe(true);
    }

    const invalidKeys = [
      'd', // < 2 chars
      'D'.repeat(64), // > 63 chars
      'Production', // uppercase
      'prod_env', // underscore
      '-dev', // leading hyphen
      'dev-', // trailing hyphen
    ];
    for (const key of invalidKeys) {
      expect(EnvironmentKeySchema.safeParse(key).success).toBe(false);
    }
  });

  it('validates UUIDs for id and projectId', () => {
    expect(EnvironmentIdSchema.safeParse(validEnvId).success).toBe(true);
    expect(EnvironmentIdSchema.safeParse('invalid-id').success).toBe(false);

    const invalidEnv = {
      id: 'invalid-id',
      projectId: 'invalid-proj-id',
      name: 'Dev',
      key: 'dev',
      type: 'DEVELOPMENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(EnvironmentSchema.safeParse(invalidEnv).success).toBe(false);
  });

  it('validates and trims environment name', () => {
    expect(EnvironmentNameSchema.safeParse('  Staging Cluster  ').data).toBe('Staging Cluster');
    expect(EnvironmentNameSchema.safeParse('').success).toBe(false);
    expect(EnvironmentNameSchema.safeParse('   ').success).toBe(false);
    expect(EnvironmentNameSchema.safeParse('x'.repeat(256)).success).toBe(false);
  });

  it('validates CreateEnvironmentInputSchema with defaults and UpdateEnvironmentInputSchema', () => {
    const createInput = {
      projectId: validProjectId,
      name: 'Dev Environment',
      key: 'development',
      type: 'DEVELOPMENT',
    };
    expect(CreateEnvironmentInputSchema.safeParse(createInput).success).toBe(true);

    const createInputDefaultType = {
      projectId: validProjectId,
      name: 'QA 1',
      key: 'qa-1',
    };
    const parsedDefault = CreateEnvironmentInputSchema.safeParse(createInputDefaultType);
    expect(parsedDefault.success).toBe(true);
    if (parsedDefault.success) {
      expect(parsedDefault.data.type).toBe('CUSTOM');
    }

    const updateInput = {
      name: 'Production Primary',
      type: 'PRODUCTION',
    };
    expect(UpdateEnvironmentInputSchema.safeParse(updateInput).success).toBe(true);
  });
});
