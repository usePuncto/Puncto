import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppExtraConfig } from '../config/webAppConfig';

/** Metro resolve @firebase/auth para o build RN, que exporta getReactNativePersistence. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rnAuth = require('@firebase/auth') as Record<string, unknown>;

let app: FirebaseApp;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApps()[0]!;
  }
  const { firebase: cfg } = getAppExtraConfig();
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error(
      'Firebase não configurado. Defina EXPO_PUBLIC_FIREBASE_* em apps/mobile-admin/.env (veja README do app).'
    );
  }
  app = initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  });
  return app;
}

/** Auth com persistência AsyncStorage (Expo Go / nativo). */
export function getFirebaseAuth() {
  const application = getFirebaseApp();
  const initializeAuth = rnAuth.initializeAuth as (app: FirebaseApp, deps: { persistence: unknown }) => import('firebase/auth').Auth;
  const getAuth = rnAuth.getAuth as (app?: FirebaseApp) => import('firebase/auth').Auth;
  const getReactNativePersistence = rnAuth.getReactNativePersistence as (s: typeof AsyncStorage) => unknown;
  try {
    return initializeAuth(application, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(application);
  }
}
