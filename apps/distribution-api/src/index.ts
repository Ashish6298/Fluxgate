export const DISTRIBUTION_API_VERSION = 'v1.0.0';

export function getDistributionApiInfo() {
  return {
    name: 'controlplane-distribution-api',
    version: DISTRIBUTION_API_VERSION,
    supportsETag: true,
  };
}
