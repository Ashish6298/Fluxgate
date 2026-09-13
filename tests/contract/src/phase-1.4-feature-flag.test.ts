import { describe, it, expect } from 'vitest';
import {
  FeatureFlagSchema,
  FeatureFlagIdSchema,
  FeatureFlagKeySchema,
  createFeatureFlag,
  InMemoryFeatureFlagRepository,
} from '@controlplane/config-model';

describe('Phase 1.4 Milestone Contract — Feature Flag', () => {
  const envIdDev = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const envIdProd = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  it('adheres to the exact FeatureFlag model specification', () => {
    const flag = createFeatureFlag({
      environmentId: envIdDev,
      key: 'new_checkout',
      name: 'New Checkout Flow',
      description: 'Enables new multi-step checkout UI',
      type: 'BOOLEAN',
      defaultValue: false,
      enabled: true,
    });

    const parsed = FeatureFlagSchema.parse(flag);
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('environmentId', envIdDev);
    expect(parsed).toHaveProperty('key', 'new_checkout');
    expect(parsed).toHaveProperty('name', 'New Checkout Flow');
    expect(parsed).toHaveProperty('description', 'Enables new multi-step checkout UI');
    expect(parsed).toHaveProperty('type', 'BOOLEAN');
    expect(parsed).toHaveProperty('defaultValue', false);
    expect(parsed).toHaveProperty('enabled', true);
    expect(parsed).toHaveProperty('createdAt');
    expect(parsed).toHaveProperty('updatedAt');

    expect(FeatureFlagIdSchema.safeParse(parsed.id).success).toBe(true);
    expect(FeatureFlagKeySchema.safeParse(parsed.key).success).toBe(true);
  });

  it('supports all 4 core flag types (Boolean, String, Number, JSON) with strict typing', () => {
    // 1. Boolean
    const boolFlag = createFeatureFlag({
      environmentId: envIdDev,
      key: 'feature_bool',
      name: 'Feature Bool',
      type: 'BOOLEAN',
      defaultValue: false,
    });
    expect(boolFlag.defaultValue).toBe(false);

    // 2. String
    const strFlag = createFeatureFlag({
      environmentId: envIdDev,
      key: 'feature_str',
      name: 'Feature String',
      type: 'STRING',
      defaultValue: 'variant_b',
    });
    expect(strFlag.defaultValue).toBe('variant_b');

    // 3. Number
    const numFlag = createFeatureFlag({
      environmentId: envIdDev,
      key: 'feature_num',
      name: 'Feature Number',
      type: 'NUMBER',
      defaultValue: 100,
    });
    expect(numFlag.defaultValue).toBe(100);

    // 4. JSON
    const jsonFlag = createFeatureFlag({
      environmentId: envIdDev,
      key: 'feature_json',
      name: 'Feature JSON',
      type: 'JSON',
      defaultValue: { algorithm: 'v2', timeoutMs: 250 },
    });
    expect(jsonFlag.defaultValue).toEqual({ algorithm: 'v2', timeoutMs: 250 });
  });

  it('guarantees environment-scoped key uniqueness and independent flag states', async () => {
    const repo = new InMemoryFeatureFlagRepository();

    // Dev environment flag enabled with true default
    const devFlag = await repo.create({
      environmentId: envIdDev,
      key: 'new_checkout',
      name: 'New Checkout Dev',
      type: 'BOOLEAN',
      defaultValue: true,
      enabled: true,
    });

    // Production environment flag disabled with false default
    const prodFlag = await repo.create({
      environmentId: envIdProd,
      key: 'new_checkout',
      name: 'New Checkout Prod',
      type: 'BOOLEAN',
      defaultValue: false,
      enabled: false,
    });

    expect(devFlag.key).toBe(prodFlag.key);
    expect(devFlag.defaultValue).toBe(true);
    expect(prodFlag.defaultValue).toBe(false);
    expect(devFlag.enabled).toBe(true);
    expect(prodFlag.enabled).toBe(false);

    // Duplicate key in same environment must be rejected
    await expect(
      repo.create({
        environmentId: envIdDev,
        key: 'new_checkout',
        name: 'New Checkout Duplicate',
        type: 'BOOLEAN',
        defaultValue: false,
      }),
    ).rejects.toThrow();
  });
});
