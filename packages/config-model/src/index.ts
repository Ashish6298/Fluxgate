import { z } from 'zod';
import { FlagTypeSchema } from '@controlplane/contracts';

export const FeatureFlagModelSchema = z.object({
  id: z.string(),
  key: z.string().min(1),
  name: z.string(),
  description: z.string().optional(),
  type: FlagTypeSchema,
  defaultValue: z.union([z.boolean(), z.string(), z.number(), z.record(z.unknown())]),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FeatureFlagModel = z.infer<typeof FeatureFlagModelSchema>;

export const ConfigurationSnapshotSchema = z.object({
  schemaVersion: z.number().int().positive(),
  projectKey: z.string().min(1),
  environmentKey: z.string().min(1),
  configurationVersion: z.number().int().nonnegative(),
  checksum: z.string().min(1),
  flags: z.array(FeatureFlagModelSchema),
});
export type ConfigurationSnapshot = z.infer<typeof ConfigurationSnapshotSchema>;
