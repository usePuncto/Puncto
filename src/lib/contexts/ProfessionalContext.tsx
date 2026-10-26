'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Professional } from '@/types/business';
import { getBusinessRole } from '@/lib/permissions';
import { useAuth } from './AuthContext';
import { useBusiness } from './BusinessContext';

interface ProfessionalContextType {
  professional: Professional | null;
  professionalId: string | null;
  isLoading: boolean;
  isOwnerProfessional?: boolean;
  /** Professional can mark presence on any turma (shared desk / curinga). */
  canManageAllAttendance?: boolean;
}

const ProfessionalContext = createContext<ProfessionalContextType | null>(null);

function mapProfessionalSnap(
  snap: { id: string; data: () => Record<string, unknown> }
): Professional {
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || data.createdAt,
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || data.updatedAt,
  } as Professional;
}

async function fetchProfessionalById(
  businessId: string,
  professionalId: string
): Promise<Professional | null> {
  const snap = await getDoc(doc(db, 'businesses', businessId, 'professionals', professionalId));
  if (!snap.exists()) return null;
  return mapProfessionalSnap(snap as { id: string; data: () => Record<string, unknown> });
}

export function ProfessionalProvider({ children }: { children: ReactNode }) {
  const { user, firebaseUser } = useAuth();
  const { business } = useBusiness();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const claims = user?.customClaims as { professionalId?: string } | undefined;
  const professionalIdFromClaims = claims?.professionalId ?? null;
  const businessRole = user && business?.id ? getBusinessRole(user, business.id) : null;

  useEffect(() => {
    if (!business?.id || !user?.id) {
      setProfessional(null);
      setIsLoading(false);
      return;
    }

    async function loadProfessional() {
      try {
        const businessId = business!.id;
        const uid = user!.id;

        // 1. Claims professionalId — only if the doc exists in THIS business
        if (professionalIdFromClaims) {
          const fromClaims = await fetchProfessionalById(businessId, professionalIdFromClaims);
          if (fromClaims) {
            setProfessional(fromClaims);
            return;
          }
        }

        // 2. Staff doc (invite syncs professionalId here; claims may be for another tenant)
        const staffSnap = await getDoc(doc(db, 'businesses', businessId, 'staff', uid));
        const staffProfessionalId = staffSnap.exists()
          ? (staffSnap.data() as { professionalId?: string }).professionalId
          : undefined;
        if (staffProfessionalId) {
          const fromStaff = await fetchProfessionalById(businessId, staffProfessionalId);
          if (fromStaff) {
            setProfessional(fromStaff);
            return;
          }
        }

        // 3. Lookup by userId (linked professional) or legacy public email
        const prosRef = collection(db, 'businesses', businessId, 'professionals');
        const userEmail = (user as { email?: string }).email;
        const byUserId = query(prosRef, where('userId', '==', uid));
        const byEmail = userEmail ? query(prosRef, where('email', '==', userEmail)) : null;

        const [userIdSnap, emailSnap] = await Promise.all([
          getDocs(byUserId),
          byEmail ? getDocs(byEmail) : Promise.resolve({ docs: [] as { id: string; data: () => Record<string, unknown> }[] }),
        ]);

        const docSnap = userIdSnap.docs[0] || emailSnap.docs[0];
        if (docSnap) {
          setProfessional(mapProfessionalSnap(docSnap as { id: string; data: () => Record<string, unknown> }));
          return;
        }

        // 4. Bootstrap owner/manager professional only — never call for pure professionals (403)
        const canEnsureOwner = businessRole === 'owner' || businessRole === 'manager';
        if (!canEnsureOwner) {
          setProfessional(null);
          return;
        }

        const token = await firebaseUser?.getIdToken();
        const res = await fetch(`/api/professionals/ensure-owner?businessId=${businessId}`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        if (res.ok) {
          const { professionalId: newId } = await res.json();
          if (newId) {
            const created = await fetchProfessionalById(businessId, newId);
            if (created) {
              setProfessional(created);
              return;
            }
          }
        }
        setProfessional(null);
      } catch {
        setProfessional(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfessional();
  }, [business?.id, user?.id, user?.email, professionalIdFromClaims, businessRole, firebaseUser]);

  const isOwnerProfessional =
    professional != null &&
    ((professional as Professional & { isOwner?: boolean }).isOwner === true ||
      professional.userId === user?.id);

  const canManageAllAttendance = professional?.canManageAllAttendance === true;

  return (
    <ProfessionalContext.Provider
      value={{
        professional,
        professionalId: professional?.id ?? null,
        isLoading,
        isOwnerProfessional: !!isOwnerProfessional,
        canManageAllAttendance,
      }}
    >
      {children}
    </ProfessionalContext.Provider>
  );
}

export function useProfessional() {
  const context = useContext(ProfessionalContext);
  if (!context) {
    throw new Error('useProfessional must be used within ProfessionalProvider');
  }
  return context;
}
