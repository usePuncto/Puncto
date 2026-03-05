'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

export interface PlatformContact {
  id: string;
  phone: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isOutgoing: boolean;
  timestamp: Date;
}

export function PlatformWhatsAppChat() {
  const { firebaseUser } = useAuth();
  const [contacts, setContacts] = useState<PlatformContact[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [selected, setSelected] = useState<PlatformContact | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadMessages = selected ? messages[selected.id] || [] : [];

  const addContact = useCallback(() => {
    const phone = newPhone.replace(/\D/g, '').trim();
    if (!phone || phone.length < 10) return;
    const id = `+${phone.startsWith('55') ? phone : '55' + phone}`;
    if (contacts.some((c) => c.phone === id || c.id === id)) return;
    const contact: PlatformContact = { id, phone: id, name: id };
    setContacts((prev) => [contact, ...prev]);
    setNewPhone('');
    setSelected(contact);
  }, [newPhone, contacts]);

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
      [selected.id]: [...(prev[selected.id] || []), optimisticMessage],
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
        [selected.id]: (prev[selected.id] || []).map((m) =>
          m.id === tempId ? { ...m, id: data.messageId || tempId } : m
        ),
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages((prev) => ({
        ...prev,
        [selected.id]: (prev[selected.id] || []).filter((m) => m.id !== tempId),
      }));
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [selected, input, firebaseUser]);

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
          <h3 className="text-sm font-semibold text-gray-900">Contacts</h3>
          <p className="mt-0.5 text-xs text-gray-500">Add a phone number to start chatting</p>
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
              Add
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">
              No contacts yet. Add a phone number above.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {contacts.map((c) => {
                const isActive = selected?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                        isActive ? 'border-l-2 border-green-600 bg-green-50' : ''
                      }`}
                    >
                      <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="truncate text-xs text-gray-500">{c.phone}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Message thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-500">{selected.phone}</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {threadMessages.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No messages yet. Type below to send.</p>
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
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  placeholder="Type a message..."
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
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <p className="text-sm text-gray-500">Select a contact to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
