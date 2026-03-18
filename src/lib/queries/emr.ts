import { useQuery } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';

export interface EMREmbedPayload {
  patientComplaint?: string;
  clinicalEvolution?: string;
  diagnosis?: string;
  prescriptionNotes?: string;
}

export interface EMRRecord {
  id: string;
  payload: EMREmbedPayload;
  status: 'draft' | 'signed';
  createdAt: Date | unknown;
  signedAt?: Date | unknown;
  createdBy?: string;
}

/**
 * Fetch signed EMR records for a patient via API (bypasses client Firestore rules)
 */
export function useEmrsForPatient(businessId: string, patientId: string | null) {
  return useQuery({
    queryKey: ['emrs', businessId, patientId],
    queryFn: async (): Promise<EMRRecord[]> => {
      if (!businessId || !patientId) return [];
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      if (!token) return [];
      const res = await fetch(
        `/api/emr/list?businessId=${encodeURIComponent(businessId)}&patientId=${encodeURIComponent(patientId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao carregar prontuários');
      }
      const data = await res.json();
      return data.map((emr: { createdAt?: string; signedAt?: string; [k: string]: unknown }) => ({
        ...emr,
        createdAt: emr.createdAt ? new Date(emr.createdAt) : emr.createdAt,
        signedAt: emr.signedAt ? new Date(emr.signedAt) : emr.signedAt,
      }));
    },
    enabled: !!businessId && !!patientId,
  });
}
