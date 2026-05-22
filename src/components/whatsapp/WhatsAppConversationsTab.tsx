'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Customer } from '@/types/booking';
import { phoneToId } from '@/lib/utils/phone';

export interface ConversationItem {
  phone: string;
  phoneId: string;
  remoteJid: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  contactName?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isOutgoing: boolean;
  timestamp: Date;
}

function formatMessageTime(
  date: Date,
  t: (key: string, values?: Record<string, string | number>) => string
): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  if (isYesterday) return t('yesterdayAt', { time });
  return (
    date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    time
  );
}

function mergeMessageLists(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of existing) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return Array.from(map.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

type Props = {
  businessId: string;
  whatsappConnected: boolean;
  isAutomated: boolean;
  customers: Customer[];
};

export function WhatsAppConversationsTab({
  businessId,
  whatsappConnected,
  isAutomated,
  customers,
}: Props) {
  const { firebaseUser } = useAuth();
  const t = useTranslations('whatsapp');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selected, setSelected] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadedPage, setLoadedPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const threadScrollRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);

  const customerByPhone = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) {
      if (!c.phone?.trim()) continue;
      map.set(phoneToId(c.phone), c);
    }
    return map;
  }, [customers]);

  const displayName = useCallback(
    (conv: ConversationItem) => {
      const customer = customerByPhone.get(conv.phoneId);
      if (customer) return `${customer.firstName} ${customer.lastName || ''}`.trim();
      if (conv.contactName) return conv.contactName;
      return conv.phone;
    },
    [customerByPhone]
  );

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string> | null> => {
    if (!firebaseUser) return null;
    const token = await firebaseUser.getIdToken(true);
    return { Authorization: `Bearer ${token}` };
  }, [firebaseUser]);

  const fetchConversations = useCallback(async () => {
    if (!firebaseUser || !businessId) return;
    setLoadingList(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await fetch(
        `/api/whatsapp/tenant/conversations?businessId=${encodeURIComponent(businessId)}`,
        { headers }
      );
      if (res.status === 401) {
        setError(t('conversationsUnauthorized'));
        setConversations([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const list = (data.conversations || []).filter(
        (c: ConversationItem) => c.remoteJid
      ) as ConversationItem[];
      setConversations(list);
      setError(null);
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, [firebaseUser, businessId, getAuthHeaders, t]);

  const fetchMessagesPage = useCallback(
    async (
      conv: ConversationItem,
      page: number
    ): Promise<{
      messages: ChatMessage[];
      hasMore: boolean;
    } | null> => {
      const headers = await getAuthHeaders();
      if (!headers) return null;

      const params = new URLSearchParams({
        businessId,
        phone: conv.phone,
        remoteJid: conv.remoteJid,
        page: String(page),
        pageSize: '25',
      });

      const res = await fetch(`/api/whatsapp/tenant/messages?${params}`, { headers });
      if (!res.ok) return null;

      const data = await res.json();
      const parsed = (data.messages || []).map(
        (m: { id: string; text: string; isOutgoing: boolean; timestamp: string }) => ({
          id: m.id,
          text: m.text,
          isOutgoing: m.isOutgoing,
          timestamp: new Date(m.timestamp),
        })
      );

      return { messages: parsed, hasMore: Boolean(data.hasMore) };
    },
    [businessId, getAuthHeaders]
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    threadEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const loadInitialMessages = useCallback(
    async (conv: ConversationItem) => {
      setLoadingMessages(true);
      setError(null);
      try {
        const result = await fetchMessagesPage(conv, 1);
        if (!result) {
          setMessages([]);
          setHasMoreOlder(false);
          return;
        }
        setMessages(result.messages);
        setLoadedPage(1);
        setHasMoreOlder(result.hasMore);
        shouldStickToBottomRef.current = true;
        requestAnimationFrame(() => scrollToBottom('auto'));
      } catch {
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [fetchMessagesPage, scrollToBottom]
  );

  const loadOlderMessages = useCallback(async () => {
    if (!selected || loadingOlder || !hasMoreOlder) return;

    const el = threadScrollRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    const prevScrollTop = el?.scrollTop ?? 0;

    setLoadingOlder(true);
    try {
      const nextPage = loadedPage + 1;
      const result = await fetchMessagesPage(selected, nextPage);
      if (!result) return;

      setMessages((prev) => mergeMessageLists(result.messages, prev));
      setLoadedPage(nextPage);
      setHasMoreOlder(result.hasMore);

      requestAnimationFrame(() => {
        if (!threadScrollRef.current) return;
        const newHeight = threadScrollRef.current.scrollHeight;
        threadScrollRef.current.scrollTop = newHeight - prevScrollHeight + prevScrollTop;
      });
    } finally {
      setLoadingOlder(false);
    }
  }, [selected, loadingOlder, hasMoreOlder, loadedPage, fetchMessagesPage]);

  const pollNewMessages = useCallback(async () => {
    if (!selected) return;
    const result = await fetchMessagesPage(selected, 1);
    if (!result) return;

    setMessages((prev) => {
      const merged = mergeMessageLists(prev, result.messages);
      const grew = merged.length > prev.length;
      if (grew && shouldStickToBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      }
      return merged;
    });
    setHasMoreOlder(result.hasMore || loadedPage > 1);
  }, [selected, fetchMessagesPage, loadedPage, scrollToBottom]);

  const handleThreadScroll = useCallback(() => {
    const el = threadScrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;

    if (el.scrollTop < 64 && hasMoreOlder && !loadingOlder && !loadingMessages) {
      void loadOlderMessages();
    }
  }, [hasMoreOlder, loadingOlder, loadingMessages, loadOlderMessages]);

  useEffect(() => {
    if (whatsappConnected && isAutomated) {
      void fetchConversations();
      const interval = setInterval(() => void fetchConversations(), 12000);
      return () => clearInterval(interval);
    }
    setLoadingList(false);
  }, [fetchConversations, whatsappConnected, isAutomated]);

  useEffect(() => {
    if (!selected?.remoteJid) {
      setMessages([]);
      setLoadedPage(0);
      setHasMoreOlder(false);
      return;
    }

    void loadInitialMessages(selected);

    const pollInterval = setInterval(() => void pollNewMessages(), 8000);
    return () => clearInterval(pollInterval);
  }, [selected?.remoteJid, loadInitialMessages, pollNewMessages]);

  const filteredConversations = conversations.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = displayName(c).toLowerCase();
    const phone = c.phone.replace(/\D/g, '');
    const searchDigits = q.replace(/\D/g, '');
    return name.includes(q) || phone.includes(searchDigits);
  });

  const sendMessage = async () => {
    if (!selected || !input.trim() || !firebaseUser) return;

    setSending(true);
    setError(null);
    const text = input.trim();
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      text,
      isOutgoing: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    shouldStickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));

    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await fetch('/api/whatsapp/tenant/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          businessId,
          to: selected.phone,
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.messageId || tempId } : m))
      );
      void fetchConversations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('sendFailed'));
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  if (!isAutomated) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600">
        {t('conversationsPlanHint')}
      </div>
    );
  }

  if (!whatsappConnected) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {t('conversationsConnectHint')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && !selected && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="flex h-[min(70vh,640px)] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <aside className="flex w-80 flex-shrink-0 flex-col border-r border-neutral-200">
          <div className="border-b border-neutral-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">{t('conversationsTitle')}</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{t('conversationsSubtitle')}</p>
          </div>
          <div className="border-b border-neutral-100 px-3 py-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('conversationsSearch')}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end px-2 py-1">
            <button
              type="button"
              onClick={() => void fetchConversations()}
              disabled={loadingList}
              className="text-xs text-neutral-500 hover:text-neutral-800"
            >
              {t('refresh')}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-green-600" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">{t('conversationsEmpty')}</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {filteredConversations.map((c) => {
                  const active = selected?.remoteJid === c.remoteJid;
                  return (
                    <li key={c.remoteJid}>
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className={`w-full px-4 py-3 text-left hover:bg-neutral-50 ${
                          active ? 'border-l-2 border-green-600 bg-green-50' : ''
                        }`}
                      >
                        <p className="truncate text-sm font-medium text-neutral-900">{displayName(c)}</p>
                        <p className="truncate text-xs text-neutral-500">
                          {c.lastMessagePreview || c.phone}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{displayName(selected)}</p>
                  <p className="text-xs text-neutral-500">{selected.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadInitialMessages(selected)}
                  disabled={loadingMessages}
                  className="text-xs text-neutral-500 hover:text-neutral-800"
                >
                  {t('refresh')}
                </button>
              </div>

              <div
                ref={threadScrollRef}
                onScroll={handleThreadScroll}
                className="flex-1 space-y-3 overflow-y-auto p-4"
              >
                {loadingOlder && (
                  <div className="flex justify-center py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-green-600" />
                    <span className="ml-2 text-xs text-neutral-500">{t('loadingOlder')}</span>
                  </div>
                )}

                {loadingMessages && messages.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-green-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-500">{t('conversationsNoMessages')}</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.isOutgoing ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          m.isOutgoing
                            ? 'rounded-br-md bg-green-600 text-white'
                            : 'rounded-bl-md bg-neutral-100 text-neutral-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                        <p
                          className={`mt-1 text-xs ${
                            m.isOutgoing ? 'text-green-100' : 'text-neutral-500'
                          }`}
                        >
                          {formatMessageTime(m.timestamp, t)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={threadEndRef} />
              </div>

              {error && (
                <div className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
              )}

              <div className="border-t border-neutral-200 p-3">
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('conversationsInputPlaceholder')}
                    rows={2}
                    disabled={sending}
                    className="flex-1 resize-none rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || sending}
                    className="self-end rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? t('sending') : t('send')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-neutral-50">
              <p className="text-sm text-neutral-500">{t('conversationsSelect')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
