/**
 * Evolution API v2 client (Baileys via HTTP).
 * @see https://doc.evolution-api.com/v2/pt/get-started/introduction
 */

import { formatDisplayPhone, phoneToId } from '@/lib/utils/phone';
import { evolutionInstanceName } from '@/lib/whatsapp/instanceName';
import {
  extractEvolutionMessageRecords,
  extractEvolutionMessagesMeta,
  extractTextFromEvolutionRecord,
} from '@/lib/whatsapp/messageContent';

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

export type EvolutionChatSummary = {
  phone: string;
  phoneId: string;
  remoteJid: string;
  lastMessagePreview: string;
  lastMessageAt: Date;
  contactName?: string;
};

function parseEvolutionTimestamp(value: unknown): Date {
  if (typeof value === 'number') {
    return new Date(value > 1e12 ? value : value * 1000);
  }
  if (typeof value === 'string') {
    const n = Number(value);
    if (!Number.isNaN(n)) return new Date(n > 1e12 ? n : n * 1000);
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function jidToPhone(jid: string): string | null {
  if (!jid || jid.includes('@g.us') || jid.includes('@lid')) return null;
  const digits = jid.replace(/@.*$/, '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

/** Resolve display phone + stable id from chat row (supports @lid + remoteJidAlt). */
function resolveChatIdentity(item: Record<string, unknown>): {
  remoteJid: string;
  phoneId: string;
  phone: string;
} | null {
  const remoteJid =
    (item.remoteJid as string) ||
    ((item.lastMessage as { key?: { remoteJid?: string } } | undefined)?.key?.remoteJid ?? '');

  if (!remoteJid || remoteJid.includes('@g.us')) return null;

  const lastKey = (item.lastMessage as { key?: Record<string, unknown> } | undefined)?.key;
  const remoteJidAlt =
    (lastKey?.remoteJidAlt as string) ||
    (item.remoteJidAlt as string) ||
    undefined;

  const altPhoneId = remoteJidAlt ? jidToPhone(remoteJidAlt) : null;
  if (altPhoneId) {
    return {
      remoteJid,
      phoneId: altPhoneId,
      phone: formatDisplayPhone(altPhoneId),
    };
  }

  const directPhoneId = jidToPhone(remoteJid);
  if (directPhoneId) {
    return {
      remoteJid,
      phoneId: directPhoneId,
      phone: formatDisplayPhone(directPhoneId),
    };
  }

  const lidId = remoteJid.replace(/@.*$/, '');
  return {
    remoteJid,
    phoneId: `lid_${lidId}`,
    phone: (item.pushName as string) || remoteJid,
  };
}

export async function findEvolutionChats(businessId: string): Promise<EvolutionChatSummary[]> {
  const instanceName = evolutionInstanceName(businessId);
  const { ok, data } = await evolutionFetch<unknown>(
    `/chat/findChats/${encodeURIComponent(instanceName)}`,
    { method: 'POST', body: JSON.stringify({}) }
  );

  if (!ok) return [];

  const rows = Array.isArray(data) ? data : [];
  const chats: EvolutionChatSummary[] = [];

  for (const row of rows) {
    const item = row as Record<string, unknown>;
    const identity = resolveChatIdentity(item);
    if (!identity) continue;

    const lastMsg = item.lastMessage as Record<string, unknown> | undefined;
    const preview =
      (typeof item.lastMessagePreview === 'string' && item.lastMessagePreview) ||
      (typeof lastMsg?.message === 'string' && lastMsg.message) ||
      (lastMsg ? extractTextFromEvolutionRecord(lastMsg) : '') ||
      '';

    const updatedAt =
      parseEvolutionTimestamp(item.updatedAt) ||
      parseEvolutionTimestamp(item.lastMessageAt) ||
      parseEvolutionTimestamp(lastMsg?.messageTimestamp);

    chats.push({
      phone: identity.phone,
      phoneId: identity.phoneId,
      remoteJid: identity.remoteJid,
      lastMessagePreview: preview,
      lastMessageAt: updatedAt,
      contactName:
        (typeof item.name === 'string' && item.name) ||
        (typeof item.pushName === 'string' && item.pushName) ||
        undefined,
    });
  }

  return chats.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

export type EvolutionMessageRow = {
  id: string;
  text: string;
  direction: 'inbound' | 'outbound';
  timestamp: Date;
};

function parseEvolutionMessageRow(item: Record<string, unknown>): EvolutionMessageRow | null {
  const key = item.key as { fromMe?: boolean; id?: string; remoteJid?: string } | undefined;
  const text = extractTextFromEvolutionRecord(item);
  if (!text) return null;
  const ts = parseEvolutionTimestamp(item.messageTimestamp ?? item.timestamp);
  return {
    id: key?.id || `evo-${ts.getTime()}-${key?.fromMe ? 'out' : 'in'}`,
    text,
    direction: key?.fromMe ? 'outbound' : 'inbound',
    timestamp: ts,
  };
}

export type EvolutionMessagesPage = {
  messages: EvolutionMessageRow[];
  page: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
};

const DEFAULT_MESSAGES_PAGE_SIZE = 25;

export async function fetchEvolutionMessagesPage(
  businessId: string,
  remoteJid: string,
  page: number,
  pageSize: number = DEFAULT_MESSAGES_PAGE_SIZE
): Promise<EvolutionMessagesPage> {
  const instanceName = evolutionInstanceName(businessId);

  const { ok, data } = await evolutionFetch<unknown>(
    `/chat/findMessages/${encodeURIComponent(instanceName)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        where: { key: { remoteJid } },
        page: Math.max(1, page),
        offset: pageSize,
      }),
    }
  );

  if (!ok) {
    return { messages: [], page: 1, totalPages: 1, total: 0, hasMore: false };
  }

  const meta = extractEvolutionMessagesMeta(data);
  const records = extractEvolutionMessageRecords(data);
  const messages = records
    .map((row) => parseEvolutionMessageRow(row as Record<string, unknown>))
    .filter((m): m is EvolutionMessageRow => m !== null)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const totalPages = meta.pages > 0 ? meta.pages : 1;

  return {
    messages,
    page: meta.currentPage,
    totalPages,
    total: meta.total,
    hasMore: meta.currentPage < totalPages,
  };
}

/** Resolve remoteJid from phone when only number is known (legacy / Firestore). */
export async function resolveRemoteJidForPhone(
  businessId: string,
  phone: string
): Promise<string | null> {
  const phoneId = phoneToId(phone);
  const chats = await findEvolutionChats(businessId);
  const match = chats.find((c) => c.phoneId === phoneId || c.phone.replace(/\D/g, '') === phoneId);
  if (match?.remoteJid) return match.remoteJid;
  return `${phoneId}@s.whatsapp.net`;
}

export async function logoutInstance(businessId: string): Promise<void> {
  const instanceName = evolutionInstanceName(businessId);
  await evolutionFetch(`/instance/logout/${encodeURIComponent(instanceName)}`, {
    method: 'DELETE',
  });
}
