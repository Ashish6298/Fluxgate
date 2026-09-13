import { createHash } from 'node:crypto';

export interface CanonicalInputParams {
  projectKey: string;
  environmentKey: string;
  flagKey: string;
  userIdentifier: string;
  rolloutSalt?: string;
}

/**
 * Builds canonical input formatted as projectKey:environmentKey:flagKey:userIdentifier:rolloutSalt
 */
export function buildCanonicalInput(params: CanonicalInputParams): string {
  const salt = params.rolloutSalt ?? 'v1';
  return `${params.projectKey}:${params.environmentKey}:${params.flagKey}:${params.userIdentifier}:${salt}`;
}

/**
 * Computes deterministic bucket from 0 to 9999 (10,000 buckets, 0.01% granularity).
 */
export function computeBucket(canonicalInput: string): number {
  const hash = createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
  // Use first 8 characters (32 bits) as unsigned integer
  const intVal = parseInt(hash.slice(0, 8), 16);
  return intVal % 10000;
}
