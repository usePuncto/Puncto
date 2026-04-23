'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { auth } from '@/lib/firebase';

export default function StudentLoginPage() {
  const { login, loading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subdomain = searchParams.get('subdomain');
  const returnUrl = searchParams.get('returnUrl') || '/tenant/student';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const withSubdomainIfNeeded = (target: string) => {
    const hasQuery = target.includes('?');
    const isLocalLike =
      typeof window !== 'undefined' &&
      (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') || window.location.hostname.includes('ngrok'));
    if (!subdomain || !isLocalLike) return target;
    if (target.includes('subdomain=')) return target;
    return `${target}${hasQuery ? '&' : '?'}subdomain=${encodeURIComponent(subdomain)}`;
  };

  /**
   * Em localhost/ngrok o layout do tenant precisa do cookie `x-business-slug` (ou ?subdomain=).
   * Contas de aluno trazem `studentBusinessId` nas claims — usamos isso quando a URL não tem subdomain.
   */
  const prepareTenantContext = useCallback(async (): Promise<{ businessId: string } | null> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    try {
      const idToken = await firebaseUser.getIdToken(true);
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      });
    } catch {
      // best effort
    }

    let businessId = subdomain?.trim() || '';
    if (!businessId) {
      try {
        const { claims } = await firebaseUser.getIdTokenResult();
        const fromClaims = claims.studentBusinessId;
        if (typeof fromClaims === 'string' && fromClaims.trim()) {
          businessId = fromClaims.trim();
        }
      } catch {
        // ignore
      }
    }

    if (!businessId) return null;

    try {
      const res = await fetch('/api/tenant/set-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
        credentials: 'include',
      });
      if (!res.ok) return null;
    } catch {
      return null;
    }

    return { businessId };
  }, [subdomain]);

  useEffect(() => {
    if (loading || user?.type !== 'student') return;
    let cancelled = false;
    void (async () => {
      const ctx = await prepareTenantContext();
      if (cancelled) return;
      if (!ctx?.businessId) {
        setError('Não foi possível identificar a escola. Use o link enviado pela escola ou faça login com ?subdomain=ID_DA_ESCOLA na URL.');
        return;
      }
      const target = withSubdomainIfNeeded(returnUrl);
      router.replace(target);
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user?.type, router, returnUrl, subdomain, prepareTenantContext]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      const ctx = await prepareTenantContext();
      if (!ctx?.businessId) {
        setError(
          'Conta sem vínculo com a escola ou escola não identificada. Confirme o convite ou abra o login com ?subdomain= (ID da escola) na URL.',
        );
        return;
      }
      window.location.href = withSubdomainIfNeeded(returnUrl);
    } catch (err: any) {
      setError(err?.message || 'Falha no login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Portal do aluno</h1>
        <p className="mt-1 text-sm text-neutral-600">Entre para ver turmas, faltas e mensalidades.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="mt-4 text-xs text-neutral-500">
          Se nao tiver acesso, solicite ao administrativo da escola.
        </p>
        <Link href="/" className="mt-3 inline-block text-xs text-blue-600 hover:underline">
          Voltar ao site
        </Link>
      </div>
    </div>
  );
}
