import {
  buildCanonicalInput,
  computeBucket,
  type CanonicalInputParams,
} from '@controlplane/hashing';

export interface RolloutParams extends CanonicalInputParams {
  percentage: number; // 0 to 100
}

/**
 * Calculates whether a user falls within a percentage rollout deterministically.
 */
export function isUserInRollout(params: RolloutParams): {
  inRollout: boolean;
  bucket: number;
  threshold: number;
} {
  if (params.percentage <= 0) {
    return { inRollout: false, bucket: 0, threshold: 0 };
  }
  if (params.percentage >= 100) {
    return { inRollout: true, bucket: 0, threshold: 10000 };
  }

  const canonical = buildCanonicalInput(params);
  const bucket = computeBucket(canonical);
  const threshold = Math.round(params.percentage * 100); // 10% -> 1000

  return {
    inRollout: bucket < threshold,
    bucket,
    threshold,
  };
}
