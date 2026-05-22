/**
 * WhatsApp conversation storage (Firestore), scoped per business.
 */
import { db } from '@/lib/firebaseAdmin';
import { Timestamp, type DocumentReference } from 'firebase-admin/firestore';
import { formatDisplayPhone, phoneToId } from '@/lib/utils/phone';

export { phoneToId, formatDisplayPhone } from '@/lib/utils/phone';

const LEGACY_CONVERSATIONS_COLLECTION = 'whatsapp_conversations';

export function remoteJidFromPhone(phone: string): string {
  return `${phoneToId(phone)}@s.whatsapp.net`;
}

function conversationsRef(businessId: string) {
  return db
    .collection('businesses')
    .doc(businessId)
    .collection('whatsapp_conversations');
}

function legacyConversationsRef() {
  return db.collection(LEGACY_CONVERSATIONS_COLLECTION);
}

export interface StoredMessage {
  id: string;
  text: string;
  direction: 'inbound' | 'outbound';
  timestamp: Date;
}

export interface Conversation {
  phone: string;
  phoneId: string;
  remoteJid?: string;
  lastMessageAt: Date;
  lastMessagePreview: string;
  contactName?: string;
}

async function upsertConversation(
  convRef: DocumentReference,
  phoneId: string,
  params: {
    text: string;
    direction: 'inbound' | 'outbound';
    messageId: string;
    timestamp: Date;
    contactName?: string;
  }
): Promise<void> {
  const messagesRef = convRef.collection('messages');

  await db.runTransaction(async (tx) => {
    const msgRef = messagesRef.doc(params.messageId);
    tx.set(msgRef, {
      text: params.text,
      direction: params.direction,
      timestamp: Timestamp.fromDate(params.timestamp),
      messageId: params.messageId,
    });
    tx.set(
      convRef,
      {
        phone: formatDisplayPhone(phoneId),
        phoneId,
        lastMessageAt: Timestamp.fromDate(params.timestamp),
        lastMessagePreview: params.text.slice(0, 80),
        updatedAt: Timestamp.now(),
        ...(params.contactName ? { contactName: params.contactName } : {}),
      },
      { merge: true }
    );
  });
}

export async function saveInboundMessage(params: {
  businessId: string;
  senderPhone: string;
  text: string;
  messageId: string;
  timestamp: Date;
  contactName?: string;
}): Promise<void> {
  const phoneId = phoneToId(params.senderPhone);
  const convRef = conversationsRef(params.businessId).doc(phoneId);
  await upsertConversation(convRef, phoneId, {
    text: params.text,
    direction: 'inbound',
    messageId: params.messageId,
    timestamp: params.timestamp,
    contactName: params.contactName,
  });
}

export async function saveOutboundMessage(params: {
  businessId: string;
  toPhone: string;
  text: string;
  messageId: string;
  timestamp: Date;
  contactName?: string;
}): Promise<void> {
  const phoneId = phoneToId(params.toPhone);
  const convRef = conversationsRef(params.businessId).doc(phoneId);
  await upsertConversation(convRef, phoneId, {
    text: params.text,
    direction: 'outbound',
    messageId: params.messageId,
    timestamp: params.timestamp,
    contactName: params.contactName,
  });
}

/** Legacy platform-wide storage (platform admin UI). */
export async function saveLegacyInboundMessage(params: {
  senderPhone: string;
  text: string;
  messageId: string;
  timestamp: Date;
}): Promise<void> {
  const phoneId = phoneToId(params.senderPhone);
  const convRef = legacyConversationsRef().doc(phoneId);
  await upsertConversation(convRef, phoneId, {
    text: params.text,
    direction: 'inbound',
    messageId: params.messageId,
    timestamp: params.timestamp,
  });
}

export async function saveLegacyOutboundMessage(params: {
  toPhone: string;
  text: string;
  messageId: string;
  timestamp: Date;
}): Promise<void> {
  const phoneId = phoneToId(params.toPhone);
  const convRef = legacyConversationsRef().doc(phoneId);
  await upsertConversation(convRef, phoneId, {
    text: params.text,
    direction: 'outbound',
    messageId: params.messageId,
    timestamp: params.timestamp,
  });
}

export async function listBusinessConversations(businessId: string): Promise<Conversation[]> {
  const snapshot = await conversationsRef(businessId)
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
      contactName: d.contactName,
    };
  });
}

export async function getBusinessMessages(
  businessId: string,
  phone: string
): Promise<StoredMessage[]> {
  const phoneId = phoneToId(phone);
  const snapshot = await conversationsRef(businessId)
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

export async function listConversations(): Promise<Conversation[]> {
  const snapshot = await legacyConversationsRef()
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
  const snapshot = await legacyConversationsRef()
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
