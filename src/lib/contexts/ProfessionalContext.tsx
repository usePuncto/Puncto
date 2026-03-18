'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Professional } from '@/types/business';
import { useAuth } from './AuthContext';
import { useBusiness } from './BusinessContext';

interface ProfessionalContextType {
  professional: Professional | null;
  professionalId: string | null;
  isLoading: boolean;
  isOwnerProfessional?: boolean;
}

const ProfessionalContext = createContext<ProfessionalContextType | null>(null);

export function ProfessionalProvider({ children }: { children: ReactNode }) {
  const { user, firebaseUser } = useAuth();
  const { business } = useBusiness();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const claims = user?.customClaims as { professionalId?: string } | undefined;
  const professionalIdFromClaims = claims?.professionalId ?? null;

  useEffect(() => {
    if (!business?.id || !user?.id) {
      setProfessional(null);
      setIsLoading(false);
      return;
    }

    async function loadProfessional() {
      try {
        // 1. If user has professionalId in claims, fetch that
        if (professionalIdFromClaims) {
          const professionalRef = doc(
            db,
            'businesses',
            business.id,
            'professionals',
            professionalIdFromClaims
          );
          const snap = await getDoc(professionalRef);
          if (snap.exists()) {
            const data = snap.data() as Record<string, unknown>;
            setProfessional({
              id: snap.id,
              ...data,
              createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || data.createdAt,
              updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || data.updatedAt,
            } as Professional);
            return;
          }
        }

        // 2. Otherwise look up by userId (owner linked to professional) or email
        const prosRef = collection(db, 'businesses', business.id, 'professionals');
        const uid = user?.id;
        const userEmail = (user as { email?: string }).email;

        if (!uid) return;

        const byUserId = query(prosRef, where('userId', '==', uid));
        const byEmail = userEmail ? query(prosRef, where('email', '==', userEmail)) : null;

        const [userIdSnap, emailSnap] = await Promise.all([
          getDocs(byUserId),
          byEmail ? getDocs(byEmail) : Promise.resolve({ docs: [] } as any),
        ]);

        const docSnap = userIdSnap.docs[0] || emailSnap.docs[0];
        if (docSnap) {
          const data = docSnap.data() as Record<string, unknown>;
          setProfessional({
            id: docSnap.id,
            ...data,
            createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || data.createdAt,
            updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || data.updatedAt,
          } as Professional);
          return;
        }

        // 3. No professional found - try to ensure owner professional exists
        const token = await firebaseUser?.getIdToken();
        const res = await fetch(`/api/professionals/ensure-owner?businessId=${business.id}`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        if (res.ok) {
          const { professionalId: newId } = await res.json();
          if (newId) {
            const ref = doc(db, 'businesses', business.id, 'professionals', newId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const data = snap.data() as Record<string, unknown>;
              setProfessional({
                id: snap.id,
                ...data,
                createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || data.createdAt,
                updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || data.updatedAt,
              } as Professional);
            }
          }
        }
      } catch {
        setProfessional(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfessional();
  }, [business?.id, user?.id, user?.email, professionalIdFromClaims, firebaseUser]);

  const isOwnerProfessional =
    professional != null &&
    ((professional as Professional & { isOwner?: boolean }).isOwner === true ||
      professional.userId === user?.id);

  return (
    <ProfessionalContext.Provider
      value={{
        professional,
        professionalId: professional?.id ?? null,
        isLoading,
        isOwnerProfessional: !!isOwnerProfessional,
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
