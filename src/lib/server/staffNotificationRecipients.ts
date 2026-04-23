import { db } from '@/lib/firebaseAdmin';

/**
 * Utilizadores a notificar por novo agendamento / reposição (donos, gestores, staff ligado ao profissional, createdBy).
 */
export async function getStaffNotificationRecipientUserIds(
  businessId: string,
  professionalId?: string,
): Promise<string[]> {
  const staffRef = db.collection('businesses').doc(businessId).collection('staff');

  const [adminSnap, businessDoc] = await Promise.all([
    staffRef.where('role', 'in', ['owner', 'manager']).get(),
    db.collection('businesses').doc(businessId).get(),
  ]);

  const adminUserIds = adminSnap.docs.map((d) => d.id);

  let professionalUserIds: string[] = [];
  if (professionalId) {
    const [proStaffSnap, proDoc] = await Promise.all([
      staffRef.where('professionalId', '==', professionalId).get(),
      db.collection('businesses').doc(businessId).collection('professionals').doc(professionalId).get(),
    ]);
    professionalUserIds = proStaffSnap.docs.map((d) => d.id);
    const proData = proDoc.data() as { userId?: string } | undefined;
    if (proData?.userId && !professionalUserIds.includes(proData.userId)) {
      professionalUserIds.push(proData.userId);
    }
  }

  const businessData = businessDoc.data() as { createdBy?: string } | undefined;
  const createdByUserId = businessData?.createdBy;

  return Array.from(
    new Set([...(createdByUserId ? [createdByUserId] : []), ...adminUserIds, ...professionalUserIds]),
  );
}
