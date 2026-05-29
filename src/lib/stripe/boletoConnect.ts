import { stripe } from '@/lib/stripe/client';
import type Stripe from 'stripe';

export type BoletoCapabilityStatus = 'active' | 'pending' | 'inactive' | 'unrequested';

export function getBoletoPaymentsCapabilityStatus(account: Stripe.Account): BoletoCapabilityStatus {
  const status = account.capabilities?.boleto_payments;
  if (status === 'active') return 'active';
  if (status === 'pending' || status === 'inactive') return status;
  return 'unrequested';
}

/** Mensagem em português conforme o status retornado em `account.capabilities.boleto_payments`. */
export function describeBoletoCapabilityStatus(
  status: BoletoCapabilityStatus,
  accountId?: string
): string {
  const id = accountId ? ` (${accountId})` : '';
  switch (status) {
    case 'active':
      return `Capability boleto_payments está active${id}. Boleto pode ser usado na API.`;
    case 'pending':
      return (
        `Capability boleto_payments está pending${id}: foi solicitada e aguarda aprovação ou dados no onboarding Stripe. ` +
        'Peça ao titular da conta conectada para concluir o cadastro no link do Connect.'
      );
    case 'inactive':
      return (
        `Capability boleto_payments está inactive${id}: não está ativa. ` +
        'No Dashboard Stripe (mesmo modo live/test da sua chave), abra Connect → Contas → esta conta e solicite/ative boleto, ou peça ao Stripe Support para habilitar boleto_payments.'
      );
    default:
      return (
        `Capability boleto_payments não foi solicitada${id} (unrequested). ` +
        'O Puncto tenta solicitar automaticamente; se continuar assim, reconecte a conta ou contate o suporte Stripe.'
      );
  }
}

export function assertBoletoPaymentsCapabilityActive(
  account: Stripe.Account
): asserts account is Stripe.Account & { capabilities: { boleto_payments: 'active' } } {
  const status = getBoletoPaymentsCapabilityStatus(account);
  if (status !== 'active') {
    throw new Error(describeBoletoCapabilityStatus(status, account.id));
  }
}

/** Solicita a capability boleto_payments na conta Connect (Express/Custom). */
export async function requestBoletoPaymentsCapability(stripeAccountId: string) {
  return stripe.accounts.update(stripeAccountId, {
    capabilities: {
      boleto_payments: { requested: true },
    },
  });
}

export async function ensureBoletoReadyForConnectedAccount(stripeAccountId: string): Promise<{
  ok: true;
  status: BoletoCapabilityStatus;
}> {
  let account = await stripe.accounts.retrieve(stripeAccountId);
  let status = getBoletoPaymentsCapabilityStatus(account);

  if (status !== 'active') {
    try {
      account = await requestBoletoPaymentsCapability(stripeAccountId);
      status = getBoletoPaymentsCapabilityStatus(account);
    } catch (e) {
      console.warn('[boleto] Could not request boleto_payments capability:', (e as Error)?.message);
    }
  }

  const country = (account.country || '').toUpperCase();
  if (country !== 'BR') {
    throw new Error(
      `A conta conectada (${stripeAccountId}) está no país ${country || 'desconhecido'}. ` +
        'Boleto exige conta Stripe no Brasil (BR).'
    );
  }

  if (!account.charges_enabled) {
    throw new Error(
      'A conta conectada ainda não está habilitada para cobranças. Finalize o onboarding Stripe Connect e tente novamente.'
    );
  }

  if (status !== 'active') {
    throw new Error(describeBoletoCapabilityStatus(status, stripeAccountId));
  }

  return { ok: true, status };
}

type PmcBoletoState = {
  available?: boolean;
  display_preference?: { value?: string };
};

export async function getConnectedAccountBoletoPmcStatus(stripeAccountId: string): Promise<{
  configId: string | null;
  boletoAvailable: boolean;
}> {
  try {
    const { configId, boletoAvailable } = await resolveConnectedAccountPaymentMethodConfiguration(
      stripeAccountId
    );
    return { configId, boletoAvailable };
  } catch {
    return { configId: null, boletoAvailable: false };
  }
}

async function resolveConnectedAccountPaymentMethodConfiguration(
  stripeAccountId: string
): Promise<{ configId: string; boletoAvailable: boolean }> {
  const listed = await stripe.paymentMethodConfigurations.list(
    { limit: 20 },
    { stripeAccount: stripeAccountId }
  );
  const config =
    listed.data.find((c) => c.is_default) ??
    listed.data.find((c) => c.application) ??
    listed.data[0];
  if (!config?.id) {
    throw new Error(
      `Nenhuma configuração de formas de pagamento encontrada na conta conectada ${stripeAccountId}.`
    );
  }

  const pmc = await stripe.paymentMethodConfigurations.retrieve(
    config.id,
    {},
    { stripeAccount: stripeAccountId }
  );
  const boleto = (pmc as { boleto?: PmcBoletoState }).boleto;
  const boletoAvailable = Boolean(boleto?.available);

  return { configId: config.id, boletoAvailable };
}

/**
 * Checkout na conta Connect usando métodos dinâmicos (PMC), como no Dashboard.
 * Em Connect, `payment_method_types: ['boleto']` costuma falhar mesmo com Boleto "Habilitado" na UI
 * até a capability `boleto_payments` estar ativa — use PMC + available=true.
 * @see https://docs.stripe.com/connect/payment-method-configurations
 */
export async function createBoletoCheckoutSession(
  params: {
    name: string;
    description?: string;
    amount: number;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  },
  stripeAccount: string
) {
  const account = await stripe.accounts.retrieve(stripeAccount);
  assertBoletoPaymentsCapabilityActive(account);
  const capabilityStatus = 'active' as const;

  const { configId, boletoAvailable } = await resolveConnectedAccountPaymentMethodConfiguration(
    stripeAccount
  );

  if (!boletoAvailable) {
    throw new Error(
      `Boleto não está disponível na conta conectada ${stripeAccount} (payment method configuration: boleto.available=false). ` +
        `Capability boleto_payments: ${capabilityStatus}. ` +
        'No Dashboard (modo live), abra Connect → Contas → esta conta → Formas de pagamento e confirme Boleto disponível; ' +
        'em Connect → Métodos de pagamento → Contas conectadas, deixe Boleto ativado por padrão. ' +
        'Teste e produção têm configurações separadas — confira se ativou em live.'
    );
  }

  const sessionBase: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    locale: 'pt-BR',
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: params.name,
            description: params.description,
          },
          unit_amount: params.amount,
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    payment_method_configuration: configId,
    payment_method_options: {
      boleto: { expires_after_days: 3 },
    },
    // Boleto exige dados do pagador (nome, e-mail, CPF/CNPJ, endereço) — coletados no Checkout.
    // @see https://docs.stripe.com/payments/boleto/accept-a-payment
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true, required: 'if_supported' },
    customer_creation: 'always',
  };

  try {
    return await stripe.checkout.sessions.create(sessionBase, { stripeAccount });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes('boleto') && message.toLowerCase().includes('invalid')) {
      throw new Error(
        `Stripe recusou boleto na conta ${stripeAccount} (capability=${capabilityStatus}, pmc=${configId}). ` +
          'Confirme que o boleto está ativo no modo LIVE na conta conectada, não só na plataforma Puncto.'
      );
    }
    throw err;
  }
}
