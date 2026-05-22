/**
 * Evolution API client for Firebase Functions.
 */

function evolutionInstanceName(businessId: string): string {
  const safe = businessId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `puncto_${safe}`.slice(0, 80);
}

export function isEvolutionConfigured(): boolean {
  return Boolean(process.env.EVOLUTION_API_URL?.trim() && process.env.EVOLUTION_API_KEY?.trim());
}

async function evolutionFetch<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data: T }> {
  const base = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
  const key = process.env.EVOLUTION_API_KEY?.trim();
  if (!base || !key) throw new Error('Evolution API not configured');

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = {} as T;
  }
  return { ok: res.ok, data };
}

export async function getConnectionState(
  businessId: string
): Promise<{ state: string }> {
  const instanceName = evolutionInstanceName(businessId);
  const { ok, data } = await evolutionFetch<{
    instance?: { state?: string };
    state?: string;
  }>(`/instance/connectionState/${encodeURIComponent(instanceName)}`);
  if (!ok) return { state: 'close' };
  const state = data.instance?.state || data.state || 'close';
  return { state };
}

export async function sendEvolutionText(
  businessId: string,
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const instanceName = evolutionInstanceName(businessId);
  const number = to.replace(/\D/g, '');

  const { ok, data } = await evolutionFetch<{
    key?: { id?: string };
    error?: string | { message?: string };
  }>(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    body: JSON.stringify({ number, text, textMessage: { text } }),
  });

  if (!ok) {
    const err =
      typeof data.error === 'string'
        ? data.error
        : (data.error as { message?: string })?.message || 'Evolution send failed';
    return { success: false, error: err };
  }

  return { success: true, messageId: data.key?.id || `evo-${Date.now()}` };
}
