import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase';
import { fetchMe, type MeResponse } from '../api/client';

type MobileAuthContextValue = {
  user: User | null;
  me: MeResponse | null;
  businessId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  setBusinessId: (id: string) => Promise<void>;
};

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null);

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [businessId, setBusinessIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setMe(null);
        setBusinessIdState(null);
        setLoading(false);
        return;
      }
      try {
        const data = await fetchMe(u);
        setMe(data);
        setBusinessIdState(data.currentBusinessId || data.businesses[0]?.id || null);
      } catch {
        setMe(null);
        setBusinessIdState(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [auth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    [auth]
  );

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  const setBusinessId = useCallback(
    async (id: string) => {
      const u = auth.currentUser;
      if (!u) return;
      const data = await fetchMe(u, id);
      setMe(data);
      setBusinessIdState(data.currentBusinessId || id);
    },
    [auth]
  );

  const value = useMemo(
    () => ({
      user,
      me,
      businessId,
      loading,
      signIn,
      signOutUser,
      setBusinessId,
    }),
    [user, me, businessId, loading, signIn, signOutUser, setBusinessId]
  );

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth(): MobileAuthContextValue {
  const ctx = useContext(MobileAuthContext);
  if (!ctx) throw new Error('useMobileAuth must be used within MobileAuthProvider');
  return ctx;
}
