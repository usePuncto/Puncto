import type { User } from '@/types/user';

/** ID do documento `customers/{id}` vinculado ao login do aluno (claims JWT + Firestore). */
export function getStudentCustomerId(user: User | null | undefined): string | undefined {
  if (!user || user.type !== 'student') return undefined;
  const id = user.studentCustomerId || user.customClaims?.studentCustomerId;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}
