/**
 * Platform WhatsApp message storage (Firestore).
 * Used for incoming webhook messages and outbound sends.
 */
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const CONVERSATIONS_COLLECTION = 'whatsapp_conversations';

/** Normalize phone to digits-only for Firestore doc ID (e.g. 5511999999999) */
export function phoneToId(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withoutLeadingZero = digits.startsWith('0') ? digits.slice(1) : digits;
  if (!withoutLeadingZero.startsWith('55')) {
    return `55${withoutLeadingZero}`;
  }
  return withoutLeadingZero;
}

/** Format for display (E.164) */
export function formatDisplayPhone(phoneId: string): string {
  return `+${phoneId}`;
}

export interface StoredMessage {
  id: string;
  text: string;
  direction: 'inbound' | 'outbound';
  timestamp: Date;
}

export async function saveInboundMessage(params: {
  senderPhone: string;
  text: string;
  messageId: string;
  timestamp: Date;
}): Promise<void> {
  const phoneId = phoneToId(params.senderPhone);
  const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(phoneId);
  const messagesRef = convRef.collection('messages');

  await db.runTransaction(async (tx) => {
    const msgRef = messagesRef.doc(params.messageId);
    tx.set(msgRef, {
      text: params.text,
      direction: 'inbound',
      timestamp: Timestamp.fromDate(params.timestamp),
      messageId: params.messageId,
    });
    tx.set(convRef, {
      phone: formatDisplayPhone(phoneId),
      phoneId,
      lastMessageAt: Timestamp.fromDate(params.timestamp),
      lastMessagePreview: params.text.slice(0, 80),
      updatedAt: Timestamp.now(),
    }, { merge: true });
  });
}

export async function saveOutboundMessage(params: {
  toPhone: string;
  text: string;
  messageId: string;
  timestamp: Date;
}): Promise<void> {
  const phoneId = phoneToId(params.toPhone);
  const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(phoneId);
  const messagesRef = convRef.collection('messages');

  await db.runTransaction(async (tx) => {
    const msgRef = messagesRef.doc(params.messageId);
    tx.set(msgRef, {
      text: params.text,
      direction: 'outbound',
      timestamp: Timestamp.fromDate(params.timestamp),
      messageId: params.messageId,
    });
    tx.set(convRef, {
      phone: formatDisplayPhone(phoneId),
      phoneId,
      lastMessageAt: Timestamp.fromDate(params.timestamp),
      lastMessagePreview: params.text.slice(0, 80),
      updatedAt: Timestamp.now(),
    }, { merge: true });
  });
}

export interface Conversation {
  phone: string;
  phoneId: string;
  lastMessageAt: Date;
  lastMessagePreview: string;
}

export async function listConversations(): Promise<Conversation[]> {
  const snapshot = await db
    .collection(CONVERSATIONS_COLLECTION)
    .orderBy('lastMessageAt', 'desc')
    .limit(100)
    .get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      phone: d.phone || formatDisplayPhone(doc.id),
      phoneId: doc.id,
      lastMessageAt: d.lastMessageAt?.toDate?.() || new Date(0),
      lastMessagePreview: d.lastMessagePreview || '',
    };
  });
}

export async function getMessages(phone: string): Promise<StoredMessage[]> {
  const phoneId = phoneToId(phone);
  const snapshot = await db
    .collection(CONVERSATIONS_COLLECTION)
    .doc(phoneId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .limit(200)
    .get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      text: d.text || '',
      direction: d.direction || 'inbound',
      timestamp: d.timestamp?.toDate?.() || new Date(0),
    };
  });
}
