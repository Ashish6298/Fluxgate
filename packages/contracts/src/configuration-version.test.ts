import { describe, it, expect } from 'vitest';
import {
  ConfigurationVersionSchema,
  CreateConfigurationVersionInputSchema,
  ConfigurationVersionIdSchema,
  ConfigurationVersionNumberSchema,
  ChecksumSchema,
  CreatedBySchema,
  VersionReasonSchema,
  ConfigurationSnapshotSchema,
} from './index.js';

describe('ConfigurationVersion Domain Model Contract (Phase 1.7)', () => {
  const validEnvId = '123e4567-e89b-12d3-a456-426614174000';
  const validVersionId = '987fcdeb-51a2-43d7-9876-543210987654';
  const validChecksum = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const sampleSnapshot = {
    schemaVersion: 1,
    projectKey: 'mobile-app',
    environmentKey: 'production',
    configurationVersion: 42,
    checksum: validChecksum,
    flags: [],
  };

  describe('Field Schemas', () => {
    it('validates UUID for ConfigurationVersion ID', () => {
      expect(ConfigurationVersionIdSchema.safeParse(validVersionId).success).toBe(true);
      expect(ConfigurationVersionIdSchema.safeParse('not-a-uuid').success).toBe(false);
    });

    it('validates version number must be positive integer >= 1', () => {
      expect(ConfigurationVersionNumberSchema.safeParse(1).success).toBe(true);
      expect(ConfigurationVersionNumberSchema.safeParse(42).success).toBe(true);
      expect(ConfigurationVersionNumberSchema.safeParse(0).success).toBe(false);
      expect(ConfigurationVersionNumberSchema.safeParse(-1).success).toBe(false);
      expect(ConfigurationVersionNumberSchema.safeParse(1.5).success).toBe(false);
    });

    it('validates checksum non-empty string', () => {
      expect(ChecksumSchema.safeParse(validChecksum).success).toBe(true);
      expect(ChecksumSchema.safeParse('').success).toBe(false);
      expect(ChecksumSchema.safeParse('   ').success).toBe(false);
    });

    it('validates createdBy and reason constraints', () => {
      expect(CreatedBySchema.safeParse('developer_123').success).toBe(true);
      expect(CreatedBySchema.safeParse('').success).toBe(false);

      expect(VersionReasonSchema.safeParse('Increase rollout from 10% to 25%').success).toBe(true);
      expect(VersionReasonSchema.safeParse('').success).toBe(false);
    });

    it('validates ConfigurationSnapshotSchema', () => {
      const parsed = ConfigurationSnapshotSchema.safeParse(sampleSnapshot);
      expect(parsed.success).toBe(true);
    });
  });

  describe('ConfigurationVersionSchema', () => {
    it('validates a complete, correct configuration version record', () => {
      const record = {
        id: validVersionId,
        environmentId: validEnvId,
        version: 42,
        snapshot: sampleSnapshot,
        checksum: validChecksum,
        createdBy: 'developer_123',
        reason: 'Increase rollout from 10% to 25%',
        createdAt: new Date().toISOString(),
      };

      const result = ConfigurationVersionSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('rejects invalid configuration version record', () => {
      const record = {
        id: 'bad-id',
        environmentId: validEnvId,
        version: -5,
        snapshot: sampleSnapshot,
        checksum: '',
        createdBy: '',
        reason: '',
        createdAt: 'invalid-date',
      };

      const result = ConfigurationVersionSchema.safeParse(record);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateConfigurationVersionInputSchema', () => {
    it('applies default reason if omitted', () => {
      const input = {
        environmentId: validEnvId,
        version: 1,
        snapshot: sampleSnapshot,
        checksum: validChecksum,
        createdBy: 'admin_user',
      };

      const parsed = CreateConfigurationVersionInputSchema.parse(input);
      expect(parsed.reason).toBe('Configuration update');
      expect(parsed.version).toBe(1);
    });

    it('allows custom reason', () => {
      const input = {
        environmentId: validEnvId,
        version: 44,
        snapshot: sampleSnapshot,
        checksum: validChecksum,
        createdBy: 'developer_123',
        reason: 'Rollback to version 41',
      };

      const parsed = CreateConfigurationVersionInputSchema.parse(input);
      expect(parsed.reason).toBe('Rollback to version 41');
    });
  });
});
