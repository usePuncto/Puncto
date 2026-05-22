/**
 * Extract display text from Evolution / Baileys message payloads.
 */
export function extractTextFromMessageContent(message: Record<string, unknown> | undefined): string {
  if (!message) return '';

  if (typeof message.conversation === 'string') return message.conversation;

  const ext = message.extendedTextMessage as { text?: string } | undefined;
  if (ext?.text) return ext.text;

  const img = message.imageMessage as { caption?: string } | undefined;
  if (img?.caption) return img.caption;

  const video = message.videoMessage as { caption?: string } | undefined;
  if (video?.caption) return video.caption;

  const doc = message.documentMessage as { caption?: string; fileName?: string } | undefined;
  if (doc?.caption) return doc.caption;
  if (doc?.fileName) return `[Documento] ${doc.fileName}`;

  const audio = message.audioMessage as unknown;
  if (audio) return '[Áudio]';

  const sticker = message.stickerMessage as unknown;
  if (sticker) return '[Figurinha]';

  const buttons = message.buttonsResponseMessage as { selectedDisplayText?: string } | undefined;
  if (buttons?.selectedDisplayText) return buttons.selectedDisplayText;

  const list = message.listResponseMessage as { title?: string; singleSelectReply?: { selectedRowId?: string } } | undefined;
  if (list?.title) return list.title;

  return '';
}

export function extractTextFromEvolutionRecord(item: Record<string, unknown>): string {
  if (typeof item.text === 'string' && item.text.trim()) return item.text;

  const messageField = item.message;
  if (typeof messageField === 'string') return messageField;
  if (messageField && typeof messageField === 'object') {
    const fromContent = extractTextFromMessageContent(messageField as Record<string, unknown>);
    if (fromContent) return fromContent;
  }

  const nested = item.message as Record<string, unknown> | undefined;
  if (nested?.message && typeof nested.message === 'object') {
    return extractTextFromMessageContent(nested.message as Record<string, unknown>);
  }

  return '';
}

export function extractEvolutionMessageRecords(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  if (typeof data !== 'object') return [];

  const root = data as Record<string, unknown>;

  if (Array.isArray(root.records)) return root.records;

  const messages = root.messages;
  if (Array.isArray(messages)) return messages;

  if (messages && typeof messages === 'object') {
    const block = messages as Record<string, unknown>;
    if (Array.isArray(block.records)) return block.records;
    if (Array.isArray(block.messages)) return block.messages;
  }

  if (Array.isArray(root.data)) return root.data;

  return [];
}

export function extractEvolutionMessagesMeta(data: unknown): {
  pages: number;
  currentPage: number;
  total: number;
} {
  if (!data || typeof data !== 'object') return { pages: 1, currentPage: 1, total: 0 };
  const root = data as Record<string, unknown>;
  const messages = root.messages;
  if (messages && typeof messages === 'object') {
    const block = messages as Record<string, unknown>;
    const pages = typeof block.pages === 'number' ? Math.max(1, block.pages) : 1;
    const currentPage = typeof block.currentPage === 'number' ? block.currentPage : 1;
    const total = typeof block.total === 'number' ? block.total : 0;
    return { pages, currentPage, total };
  }
  return { pages: 1, currentPage: 1, total: 0 };
}
