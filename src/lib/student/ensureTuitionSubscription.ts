/**
 * Cria assinatura Stripe incompleta para o aluno (1º pagamento no portal),
 * usando o tipo de mensalidade e valor sugerido já definidos no cadastro.
 */
export type EnsureTuitionSubscriptionResult =
  | { ok: true; created: true }
  | { ok: true; created: false; reason: 'already_exists' }
  | { ok: false; error: string };

export async function ensureStudentTuitionSubscription(
  getIdToken: () => Promise<string>,
  params: { businessId: string; customerId: string },
): Promise<EnsureTuitionSubscriptionResult> {
  const token = await getIdToken();
  const res = await fetch('/api/students/subscriptions/manage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'create',
      businessId: params.businessId,
      customerId: params.customerId,
      currency: 'brl',
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (res.status === 409 || data.code === 'subscription_exists') {
    return { ok: true, created: false, reason: 'already_exists' };
  }
  if (!res.ok) {
    const msg =
      typeof data.error === 'string' ? data.error : 'Não foi possível preparar a mensalidade para o portal.';
    return { ok: false, error: msg };
  }
  return { ok: true, created: true };
}
