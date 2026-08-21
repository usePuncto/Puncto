import {
  doc,
  getDoc,
  setDoc,
  deleteField,
  type Firestore,
} from 'firebase/firestore';
import type { Firestore as AdminFirestore } from 'firebase-admin/firestore';

export const PROFESSIONAL_CONTACT_DOC = 'contact';

export type ProfessionalContact = {
  email?: string;
  phone?: string;
};

/** Client SDK path: businesses/{id}/professionals/{proId}/private/contact */
export function professionalContactRef(db: Firestore, businessId: string, professionalId: string) {
  return doc(
    db,
    'businesses',
    businessId,
    'professionals',
    professionalId,
    'private',
    PROFESSIONAL_CONTACT_DOC
  );
}

export async function readProfessionalContactClient(
  db: Firestore,
  businessId: string,
  professionalId: string
): Promise<ProfessionalContact> {
  try {
    const snap = await getDoc(professionalContactRef(db, businessId, professionalId));
    if (!snap.exists()) return {};
    const data = snap.data() as ProfessionalContact;
    return {
      email: typeof data.email === 'string' ? data.email : undefined,
      phone: typeof data.phone === 'string' ? data.phone : undefined,
    };
  } catch {
    return {};
  }
}

export async function writeProfessionalContactClient(
  db: Firestore,
  businessId: string,
  professionalId: string,
  contact: ProfessionalContact
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (contact.email !== undefined) payload.email = contact.email;
  if (contact.phone !== undefined) payload.phone = contact.phone;
  await setDoc(professionalContactRef(db, businessId, professionalId), payload, { merge: true });
}

/** Strip contact fields from a professional payload destined for the public doc. */
export function withoutContactPii<T extends Record<string, unknown>>(data: T): T {
  const { email: _e, phone: _p, ...rest } = data;
  return rest as T;
}

export const deleteContactFields = {
  email: deleteField(),
  phone: deleteField(),
};

/** Admin SDK: resolve email from private contact, falling back to legacy public field. */
export async function resolveProfessionalEmailAdmin(
  db: AdminFirestore,
  businessId: string,
  professionalId: string,
  legacyEmail?: string | null
): Promise<string | undefined> {
  const contactSnap = await db
    .collection('businesses')
    .doc(businessId)
    .collection('professionals')
    .doc(professionalId)
    .collection('private')
    .doc(PROFESSIONAL_CONTACT_DOC)
    .get();
  const fromPrivate = contactSnap.data()?.email;
  if (typeof fromPrivate === 'string' && fromPrivate.trim()) {
    return fromPrivate.trim();
  }
  if (typeof legacyEmail === 'string' && legacyEmail.trim()) {
    return legacyEmail.trim();
  }
  return undefined;
}

export async function writeProfessionalContactAdmin(
  db: AdminFirestore,
  businessId: string,
  professionalId: string,
  contact: ProfessionalContact
): Promise<void> {
  await db
    .collection('businesses')
    .doc(businessId)
    .collection('professionals')
    .doc(professionalId)
    .collection('private')
    .doc(PROFESSIONAL_CONTACT_DOC)
    .set(
      {
        ...contact,
        updatedAt: new Date(),
      },
      { merge: true }
    );
}
