/** Evolution API instance name per business (alphanumeric + underscore). */
export function evolutionInstanceName(businessId: string): string {
  const safe = businessId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `puncto_${safe}`.slice(0, 80);
}

export function businessIdFromEvolutionInstance(instanceName: string): string | null {
  if (!instanceName.startsWith('puncto_')) return null;
  return instanceName.slice('puncto_'.length) || null;
}
