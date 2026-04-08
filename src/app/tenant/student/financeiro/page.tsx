'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useStudentPayments, useStudentSubscriptions } from '@/lib/queries/studentPortal';

export default function StudentFinanceiroPage() {
  const { user, firebaseUser } = useAuth();
  const { business } = useBusiness();
  const studentCustomerId = user?.customClaims?.studentCustomerId;
  const { data: payments = [] } = useStudentPayments(business.id, studentCustomerId);
  const { data: subscriptions = [] } = useStudentSubscriptions(business.id, studentCustomerId);
  const activeSub = subscriptions.find((s) => s.status === 'active' || s.status === 'past_due') || subscriptions[0];

  const openBillingPortal = async () => {
    if (!firebaseUser || !activeSub) return;
    const token = await firebaseUser.getIdToken();
    const res = await fetch('/api/students/subscriptions/manage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'portal',
        businessId: business.id,
        subscriptionId: activeSub.id,
      }),
    });
    const data = await res.json();
    if (res.ok && data?.url) window.location.href = data.url;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Financeiro</h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm text-neutral-500">Assinatura atual</p>
        <p className="mt-1 text-base font-medium text-neutral-900">{activeSub?.status || 'Sem assinatura ativa'}</p>
        <button
          type="button"
          onClick={openBillingPortal}
          disabled={!activeSub}
          className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          Gerenciar pagamento
        </button>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-sm text-neutral-500">Histórico de pagamentos</p>
        {payments.length === 0 ? (
          <p className="text-sm text-neutral-500">Sem pagamentos registrados.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2">
                <span className="text-sm text-neutral-700">{p.status}</span>
                <span className="text-sm font-medium text-neutral-900">
                  {(p.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: p.currency.toUpperCase() })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
