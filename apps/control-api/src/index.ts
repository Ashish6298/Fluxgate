export const CONTROL_API_VERSION = 'v1.0.0';

export function getControlApiInfo() {
  return {
    name: 'controlplane-control-api',
    version: CONTROL_API_VERSION,
    status: 'operational',
  };
}
