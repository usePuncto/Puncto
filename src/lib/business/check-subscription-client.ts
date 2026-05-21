import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function fetchBusinessAccessBlocked(businessKey: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/business/access-status?key=${encodeURIComponent(businessKey)}`);
    if (!res.ok) return false;
    const data = (await res.json()) as { blocked?: boolean };
    return data.blocked === true;
  } catch {
    return false;
  }
}

export async function signOutAndClearSession(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  try {
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
  } catch {
    // ignore
  }
}
