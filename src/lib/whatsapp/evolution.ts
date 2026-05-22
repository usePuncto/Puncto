/**
 * Evolution API v2 client (Baileys via HTTP).
 * @see https://doc.evolution-api.com/v2/pt/get-started/introduction
 */

import { evolutionInstanceName } from '@/lib/whatsapp/instanceName';

export type EvolutionConnectionState = 'open' | 'close' | 'connecting' | string;

export function isEvolutionConfigured(): boolean {
  return Boolean(process.env.EVOLUTION_API_URL?.trim() && process.env.EVOLUTION_API_KEY?.trim());
}

function baseUrl(): string {
  const url = process.env.EVOLUTION_API_URL?.trim();
  if (!url) throw new Error('EVOLUTION_API_URL not configured');
  return url.replace(/\/$/, '');
}

function apiKey(): string {
  const key = process.env.EVOLUTION_API_KEY?.trim();
  if (!key) throw new Error('EVOLUTION_API_KEY not configured');
  return key;
}

export function evolutionWebhookBaseUrl(): string | null {
  const base =
    process.env.EVOLUTION_WEBHOOK_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    null;
  return base ? base.replace(/\/$/, '') : null;
}

async function evolutionFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      apikey: apiKey(),
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
  return { ok: res.ok, status: res.status, data };
}

export function webhookUrlForBusiness(businessId: string): string | null {
  const base = evolutionWebhookBaseUrl();
  if (!base) return null;
  return `${base}/api/whatsapp/evolution/webhook?businessId=${encodeURIComponent(businessId)}`;
}

export async function createInstance(businessId: string): Promise<QrConnectResult> {
  const instanceName = evolutionInstanceName(businessId);
  const webhookUrl = webhookUrlForBusiness(businessId);

  const body: Record<string, unknown> = {
    instanceName,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
  };

  if (webhookUrl) {
    body.webhook = {
      url: webhookUrl,
      enabled: true,
      webhookByEvents: false,
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    };
  }

  const { ok, status, data } = await evolutionFetch<Record<string, unknown>>(
    '/instance/create',
    { method: 'POST', body: JSON.stringify(body) }
  );

  if (ok) {
    return parseQrPayload(data);
  }

  if (status === 403) {
    return {};
  }

  const msg =
    (data.response as { message?: string[] } | undefined)?.message?.[0] ||
    (data.message as string) ||
    (data.error as string) ||
    'Failed to create Evolution instance';
  if (/already|exist/i.test(String(msg))) {
    return {};
  }
  throw new Error(String(msg));
}

export type QrConnectResult = {
  qrCodeBase64?: string;
  pairingCode?: string;
  code?: string;
};

function parseQrPayload(data: Record<string, unknown>): QrConnectResult {
  const qrcode = data.qrcode as Record<string, unknown> | undefined;
  const source = qrcode && typeof qrcode === 'object' ? qrcode : data;

  const qrCodeBase64 =
    (typeof source.base64 === 'string' && source.base64) ||
    (typeof data.base64 === 'string' && data.base64) ||
    undefined;

  const pairingCode =
    (typeof source.pairingCode === 'string' && source.pairingCode) ||
    (typeof source.pairing_code === 'string' && source.pairing_code) ||
    undefined;

  const code = typeof source.code === 'string' ? source.code : undefined;

  return { qrCodeBase64, pairingCode, code };
}

export async function connectInstance(businessId: string): Promise<QrConnectResult> {
  const instanceName = evolutionInstanceName(businessId);
  const { ok, status, data } = await evolutionFetch<Record<string, unknown>>(
    `/instance/connect/${encodeURIComponent(instanceName)}`
  );

  if (!ok) {
    const msg =
      (data.message as string) ||
      (data.error as string) ||
      (Array.isArray((data.response as { message?: string[] })?.message)
        ? (data.response as { message: string[] }).message[0]
        : undefined) ||
      `Evolution API connect failed (${status})`;
    throw new Error(msg);
  }

  return parseQrPayload(data);
}

/** Create (if needed) + connect; returns best available QR payload. */
export async function ensureInstanceAndGetQr(businessId: string): Promise<QrConnectResult> {
  const created = await createInstance(businessId);
  const connected = await connectInstance(businessId);
  return {
    qrCodeBase64: connected.qrCodeBase64 || created.qrCodeBase64,
    pairingCode: connected.pairingCode || created.pairingCode,
    code: connected.code || created.code,
  };
}

export async function getConnectionState(
  businessId: string
): Promise<{ state: EvolutionConnectionState; phoneNumber?: string }> {
  const instanceName = evolutionInstanceName(businessId);
  const { ok, data } = await evolutionFetch<{
    instance?: { state?: string; status?: string };
    state?: string;
    status?: string;
  }>(`/instance/connectionState/${encodeURIComponent(instanceName)}`);

  if (!ok) {
    return { state: 'close' };
  }

  const state = (data.instance?.state || data.instance?.status || data.state || data.status || 'close') as EvolutionConnectionState;

  let phoneNumber: string | undefined;
  if (state === 'open') {
    phoneNumber = await fetchInstancePhone(instanceName);
  }

  return { state, phoneNumber };
}

async function fetchInstancePhone(instanceName: string): Promise<string | undefined> {
  const { ok, data } = await evolutionFetch<
    Array<{
      instance?: { instanceName?: string; owner?: string; ownerJid?: string };
      owner?: string;
      ownerJid?: string;
    }>
  >(`/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`);

  if (!ok || !Array.isArray(data) || data.length === 0) return undefined;

  const row = data[0];
  const owner =
    row.instance?.owner ||
    row.instance?.ownerJid ||
    row.owner ||
    row.ownerJid ||
    '';
  const digits = owner.replace(/@.*$/, '').replace(/\D/g, '');
  if (!digits) return undefined;
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
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
    message?: { key?: { id?: string } };
    error?: string | { message?: string };
  }>(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    body: JSON.stringify({
      number,
      text,
      textMessage: { text },
    }),
  });

  if (!ok) {
    const err =
      typeof data.error === 'string'
        ? data.error
        : (data.error as { message?: string })?.message || 'Evolution send failed';
    return { success: false, error: err };
  }

  const messageId = data.key?.id || data.message?.key?.id || `evo-${Date.now()}`;
  return { success: true, messageId };
}

export async function logoutInstance(businessId: string): Promise<void> {
  const instanceName = evolutionInstanceName(businessId);
  await evolutionFetch(`/instance/logout/${encodeURIComponent(instanceName)}`, {
    method: 'DELETE',
  });
}
