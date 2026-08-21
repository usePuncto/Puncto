import { auth } from '@/lib/firebase';

/**
 * Builds headers with a verified Firebase ID token for tenant admin API calls.
 * Throws if the user is not signed in.
 */
export async function getAuthHeaders(
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Você precisa estar autenticado para continuar.');
  }
  const token = await user.getIdToken();
  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
}
