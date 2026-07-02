import { UserRecord } from 'firebase-admin/auth';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export type AccountAccessStatus = 'active' | 'pending_first_login';

export function hasUserLoggedIn(userRecord: UserRecord): boolean {
  const creation = new Date(userRecord.metadata.creationTime).getTime();
  const lastSignIn = new Date(userRecord.metadata.lastSignInTime).getTime();
  return lastSignIn > creation + 1000;
}

export function getAccountAccessStatus(userRecord: UserRecord): AccountAccessStatus {
  return hasUserLoggedIn(userRecord) ? 'active' : 'pending_first_login';
}

export function getLastAccessIso(userRecord: UserRecord, firestoreLastLogin?: Date | null): string | null {
  if (hasUserLoggedIn(userRecord)) {
    return userRecord.metadata.lastSignInTime;
  }
  if (firestoreLastLogin && firestoreLastLogin.getTime() > new Date(userRecord.metadata.creationTime).getTime() + 1000) {
    return firestoreLastLogin.toISOString();
  }
  return null;
}

export async function updateLastLogin(uid: string): Promise<void> {
  await db.collection('users').doc(uid).set(
    { lastLoginAt: Timestamp.now() },
    { merge: true }
  );
}
