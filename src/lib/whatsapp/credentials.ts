/**
 * Per-business WhatsApp credentials (Meta Embedded Signup).
 * Stored server-side only - never exposed to frontend.
 */
import { db } from '@/lib/firebaseAdmin';

export interface WhatsAppCredentials {
  businessId: string;
  phoneNumberId: string;
  accessToken: string;
  wabaId: string;
  phoneNumber?: string;
  updatedAt: Date;
}

const COLLECTION = 'business_whatsapp_credentials';

export async function getWhatsAppCredentials(
  businessId: string
): Promise<WhatsAppCredentials | null> {
  const doc = await db.collection(COLLECTION).doc(businessId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data) return null;
  return {
    businessId: doc.id,
    phoneNumberId: data.phoneNumberId,
    accessToken: data.accessToken,
    wabaId: data.wabaId,
    phoneNumber: data.phoneNumber,
    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
  };
}

export async function saveWhatsAppCredentials(
  credentials: Omit<WhatsAppCredentials, 'updatedAt'>
): Promise<void> {
  const updatedAt = new Date();
  await db.collection(COLLECTION).doc(credentials.businessId).set({
    phoneNumberId: credentials.phoneNumberId,
    accessToken: credentials.accessToken,
    wabaId: credentials.wabaId,
    phoneNumber: credentials.phoneNumber || null,
    updatedAt,
  });
}

export async function deleteWhatsAppCredentials(businessId: string): Promise<void> {
  await db.collection(COLLECTION).doc(businessId).delete();
}
