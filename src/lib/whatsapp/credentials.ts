/**
 * Per-business WhatsApp credentials.
 * Evolution API (Baileys) or legacy Meta Cloud API — server-side only.
 */
import type { DocumentData } from 'firebase-admin/firestore';
import { db } from '@/lib/firebaseAdmin';
import { evolutionInstanceName } from '@/lib/whatsapp/instanceName';

export type WhatsAppProvider = 'evolution' | 'meta';

export interface WhatsAppCredentials {
  businessId: string;
  provider: WhatsAppProvider;
  instanceName?: string;
  phoneNumber?: string;
  connectionState?: string;
  /** Meta Cloud API (legacy) */
  phoneNumberId?: string;
  accessToken?: string;
  wabaId?: string;
  updatedAt: Date;
}

const COLLECTION = 'business_whatsapp_credentials';

function docToCredentials(businessId: string, data: DocumentData): WhatsAppCredentials {
  const provider: WhatsAppProvider =
    data.provider === 'meta' || (data.phoneNumberId && data.accessToken)
      ? 'meta'
      : 'evolution';

  return {
    businessId,
    provider,
    instanceName: data.instanceName || evolutionInstanceName(businessId),
    phoneNumber: data.phoneNumber || undefined,
    connectionState: data.connectionState || undefined,
    phoneNumberId: data.phoneNumberId,
    accessToken: data.accessToken,
    wabaId: data.wabaId,
    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
  };
}

export async function getWhatsAppCredentials(
  businessId: string
): Promise<WhatsAppCredentials | null> {
  const doc = await db.collection(COLLECTION).doc(businessId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data) return null;
  return docToCredentials(doc.id, data);
}

export async function saveEvolutionCredentials(params: {
  businessId: string;
  phoneNumber?: string;
  connectionState: string;
}): Promise<void> {
  const instanceName = evolutionInstanceName(params.businessId);
  await db.collection(COLLECTION).doc(params.businessId).set(
    {
      provider: 'evolution',
      instanceName,
      phoneNumber: params.phoneNumber || null,
      connectionState: params.connectionState,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  const businessRef = db.collection('businesses').doc(params.businessId);
  const businessDoc = await businessRef.get();
  if (businessDoc.exists && params.phoneNumber) {
    const current = businessDoc.data()?.settings?.whatsapp || {};
    await businessRef.update({
      'settings.whatsapp': {
        ...current,
        number: params.phoneNumber,
        apiProvider: 'evolution',
        instanceName,
      },
      updatedAt: new Date(),
    });
  }
}

export async function saveWhatsAppCredentials(
  credentials: Omit<WhatsAppCredentials, 'updatedAt' | 'provider'> & {
    provider?: WhatsAppProvider;
  }
): Promise<void> {
  const updatedAt = new Date();
  await db.collection(COLLECTION).doc(credentials.businessId).set({
    provider: credentials.provider || 'meta',
    instanceName: credentials.instanceName || null,
    phoneNumberId: credentials.phoneNumberId || null,
    accessToken: credentials.accessToken || null,
    wabaId: credentials.wabaId || null,
    phoneNumber: credentials.phoneNumber || null,
    connectionState: credentials.connectionState || null,
    updatedAt,
  });
}

export async function deleteWhatsAppCredentials(businessId: string): Promise<void> {
  await db.collection(COLLECTION).doc(businessId).delete();
}
