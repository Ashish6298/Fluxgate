export const DASHBOARD_VERSION = 'v1.0.0';

export function getDashboardMetadata() {
  return {
    title: 'CONTROLPLANE Management Dashboard',
    version: DASHBOARD_VERSION,
    sections: [
      'organizations',
      'projects',
      'environments',
      'flags',
      'rules',
      'rollouts',
      'versions',
      'audit',
      'keys',
    ],
  };
}
