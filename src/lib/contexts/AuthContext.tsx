'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types/user';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isPlatformAdmin: boolean;
  getBusinessRole: (businessId: string) => 'owner' | 'manager' | 'professional' | null;
  hasPermission: (businessId: string, permission: string) => Promise<boolean>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children, ignoreAuth }: { children: ReactNode; ignoreAuth?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [businessRoles, setBusinessRoles] = useState<Record<string, 'owner' | 'manager' | 'professional'>>({});

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      // CRITICAL: When ignoreAuth is true (platform_admin/business_user viewing public tenant),
      // mask the session - do NOT call signOut(), just hide user from this context
      if (ignoreAuth) {
        setFirebaseUser(null);
        setUser(null);
        setIsPlatformAdmin(false);
        setBusinessRoles({});
        setLoading(false);
        return;
      }

      if (firebaseUser) {
        try {
          // Set Firebase user
          setFirebaseUser(firebaseUser);

          // Fetch user document from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setUser(userData);

            // Parse custom claims from token - STRICT USER TYPE ENFORCEMENT
            const tokenResult = await firebaseUser.getIdTokenResult();
            const claims = tokenResult.claims;

            // Validate user type matches Firestore document
            const userType = claims.userType || userData.type;
            if (userType !== userData.type) {
              console.warn('[AuthContext] User type mismatch between JWT and Firestore:', {
                jwt: userType,
                firestore: userData.type,
              });
            }

            // Set platform admin flag (only if userType is platform_admin)
            const isPlatformAdminUser =
              (claims.userType === 'platform_admin' || userData.type === 'platform_admin') &&
              claims.platformAdmin === true;
            setIsPlatformAdmin(isPlatformAdminUser);

            // Set business roles (only if userType is business_user)
            const businessRolesData =
              (claims.userType === 'business_user' || userData.type === 'business_user')
                ? (claims.businessRoles as Record<string, 'owner' | 'manager' | 'professional'>) || {}
                : {};
            setBusinessRoles(businessRolesData);
          } else {
            // User document doesn't exist yet (might be creating)
            setUser(null);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Erro ao carregar dados do usuário');
        }
      } else {
        // User is logged out
        setFirebaseUser(null);
        setUser(null);
        setIsPlatformAdmin(false);
        setBusinessRoles({});
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [ignoreAuth]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // State updates handled by onAuthStateChanged
    } catch (err: any) {
      const errorMessage = translateFirebaseError(err.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name
      await updateProfile(userCredential.user, { displayName });

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userData = {
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        displayName: displayName || '',
        photoURL: userCredential.user.photoURL || '',
        type: 'customer', // Default user type
        customClaims: {}, // Empty custom claims initially
        preferences: {
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo',
        },
        createdAt: new Date(),
        lastLoginAt: new Date(),
        consentVersion: '1.0', // LGPD consent version
        marketingConsent: false, // Default to false
      };

      await setDoc(userDocRef, userData);

      // State updates handled by onAuthStateChanged
    } catch (err: any) {
      const errorMessage = translateFirebaseError(err.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      // State updates handled by onAuthStateChanged
    } catch (err: any) {
      const errorMessage = 'Erro ao fazer logout';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      const errorMessage = translateFirebaseError(err.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getBusinessRole = (businessId: string): 'owner' | 'manager' | 'professional' | null => {
    return businessRoles[businessId] || null;
  };

  const hasPermission = async (businessId: string, permission: string): Promise<boolean> => {
    if (!user) return false;

    // Platform admins have all permissions
    if (isPlatformAdmin) return true;

    // Owners have all permissions
    if (businessRoles[businessId] === 'owner') return true;

    // For managers and professionals, check staff document permissions
    try {
      const staffDocRef = doc(db, 'businesses', businessId, 'staff', user.id);
      const staffDoc = await getDoc(staffDocRef);

      if (staffDoc.exists()) {
        const permissions = staffDoc.data().permissions || {};
        return permissions[permission] === true;
      }

      return false;
    } catch (err) {
      console.error('Error checking permission:', err);
      return false;
    }
  };

  const refreshToken = async () => {
    if (firebaseUser) {
      try {
        const tokenResult = await firebaseUser.getIdTokenResult(true); // Force refresh
        const claims = tokenResult.claims;

        setIsPlatformAdmin(claims.platformAdmin === true);
        setBusinessRoles((claims.businessRoles as Record<string, 'owner' | 'manager' | 'professional'>) || {});
      } catch (err) {
        console.error('Error refreshing token:', err);
      }
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    login,
    signup,
    logout,
    resetPassword,
    isPlatformAdmin,
    getBusinessRole,
    hasPermission,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Helper function to translate Firebase error codes to Portuguese
function translateFirebaseError(code: string): string {
  const errors: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido',
    'auth/user-disabled': 'Esta conta foi desativada',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'Este e-mail já está em uso',
    'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
    'auth/operation-not-allowed': 'Operação não permitida',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',
    'auth/invalid-credential': 'Credenciais inválidas',
  };

  return errors[code] || 'Erro desconhecido. Tente novamente';
}
