'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

export interface PlatformContact {
  id: string;
  phone: string;
  name: string;
  lastMessagePreview?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isOutgoing: boolean;
  timestamp: Date;
}

function formatMessageTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  if (isYesterday) return `Ontem ${time}`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + time;
}

export function PlatformWhatsAppChat() {
  const { firebaseUser } = useAuth();
  const [conversations, setConversations] = useState<PlatformContact[]>([]);
  const [contacts, setContacts] = useState<PlatformContact[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [selected, setSelected] = useState<PlatformContact | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allContacts = [...conversations, ...contacts.filter((c) => !conversations.some((conv) => conv.phone === c.phone))];
  const threadMessages = selected ? messages[selected.phone] || [] : [];

  const fetchConversations = useCallback(async () => {
    if (!firebaseUser) return;
    setLoadingConversations(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/whatsapp/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConversations(
        (data.conversations || []).map((c: { phone: string; lastMessagePreview?: string }) => ({
          id: c.phone,
          phone: c.phone,
          name: c.phone,
          lastMessagePreview: c.lastMessagePreview,
        }))
      );
    } catch {
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, [firebaseUser]);

  const fetchMessages = useCallback(
    async (phone: string) => {
      if (!firebaseUser) return;
      setLoadingMessages(true);
      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(phone)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch messages');
        const data = await res.json();
        setMessages((prev) => ({
          ...prev,
          [phone]: (data.messages || []).map((m: { id: string; text: string; isOutgoing: boolean; timestamp: string }) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
      } catch {
        setMessages((prev) => ({ ...prev, [phone]: [] }));
      } finally {
        setLoadingMessages(false);
      }
    },
    [firebaseUser]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selected) {
      fetchMessages(selected.phone);
    }
  }, [selected?.phone, fetchMessages]);

  const addContact = useCallback(() => {
    const phone = newPhone.replace(/\D/g, '').trim();
    if (!phone || phone.length < 10) return;
    const id = `+${phone.startsWith('55') ? phone : '55' + phone}`;
    if (allContacts.some((c) => c.phone === id)) return;
    const contact: PlatformContact = { id, phone: id, name: id };
    setContacts((prev) => [contact, ...prev]);
    setNewPhone('');
    setSelected(contact);
  }, [newPhone, allContacts]);

  const handleSelectContact = useCallback((contact: PlatformContact) => {
    setSelected(contact);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!selected || !input.trim() || !firebaseUser) return;

    setSending(true);
    setError(null);

    const text = input.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      text,
      isOutgoing: true,
      timestamp: new Date(),
    };

    setMessages((prev) => ({
      ...prev,
      [selected.phone]: [...(prev[selected.phone] || []), optimisticMessage],
    }));
    setInput('');

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: selected.phone, text }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send');
      }

      setMessages((prev) => ({
        ...prev,
        [selected.phone]: (prev[selected.phone] || []).map((m) =>
          m.id === tempId ? { ...m, id: data.messageId || tempId } : m
        ),
      }));
      fetchConversations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages((prev) => ({
        ...prev,
        [selected.phone]: (prev[selected.phone] || []).filter((m) => m.id !== tempId),
      }));
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [selected, input, firebaseUser, fetchConversations]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[560px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Contacts sidebar */}
      <aside className="flex w-72 flex-shrink-0 flex-col border-r border-gray-200">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Contatos</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Conversas aparecem quando alguém te enviar mensagem
          </p>
        </div>
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex gap-2">
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addContact()}
              placeholder="+5511999999999"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <button
              type="button"
              onClick={addContact}
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Adicionar
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex justify-end px-2 py-1">
            <button
              type="button"
              onClick={fetchConversations}
              disabled={loadingConversations}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Atualizar
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
              </div>
            ) : allContacts.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">
                Nenhuma conversa ainda. Adicione um número ou aguarde alguém te enviar mensagem.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {allContacts.map((c) => {
                  const isActive = selected?.phone === c.phone;
                  return (
                    <li key={c.phone}>
                      <button
                        type="button"
                        onClick={() => handleSelectContact(c)}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                          isActive ? 'border-l-2 border-green-600 bg-green-50' : ''
                        }`}
                      >
                        <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {c.lastMessagePreview || c.phone}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {/* Message thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
                <p className="text-xs text-gray-500">{selected.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => selected && fetchMessages(selected.phone)}
                disabled={loadingMessages}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Atualizar
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-green-600" />
                </div>
              ) : threadMessages.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  Nenhuma mensagem ainda. Digite abaixo para enviar (o destinatário precisa ter te enviado mensagem primeiro).
                </p>
              ) : (
                threadMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.isOutgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        m.isOutgoing
                          ? 'rounded-br-md bg-green-600 text-white'
                          : 'rounded-bl-md bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                      <p
                        className={`mt-1 text-xs ${
                          m.isOutgoing ? 'text-green-100' : 'text-gray-500'
                        }`}
                      >
                        {formatMessageTime(m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp))}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {error && (
              <div className="flex-shrink-0 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
            )}

            <div className="flex-shrink-0 border-t border-gray-200 p-3">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite uma mensagem..."
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="self-end rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <p className="text-sm text-gray-500">Selecione um contato para ver a conversa</p>
          </div>
        )}
      </div>
    </div>
  );
}
