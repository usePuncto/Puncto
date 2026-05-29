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
  display_preference?: { value?: string; preference?: string };
};

function readBoletoFromPmc(pmc: { boleto?: PmcBoletoState }) {
  const boleto = pmc.boleto;
  const display =
    boleto?.display_preference?.value ?? boleto?.display_preference?.preference ?? 'unknown';
  return {
    available: Boolean(boleto?.available),
    displayPreference: display,
  };
}

/** Liga boleto na PMC (display_preference=on); `available` só fica true com capability active. */
async function enableBoletoOnPaymentMethodConfiguration(
  configId: string,
  stripeAccountId: string
) {
  return stripe.paymentMethodConfigurations.update(
    configId,
    {
      boleto: {
        display_preference: { preference: 'on' },
      },
    },
    { stripeAccount: stripeAccountId }
  );
}

export async function getConnectedAccountBoletoPmcStatus(stripeAccountId: string): Promise<{
  configId: string | null;
  boletoAvailable: boolean;
  boletoDisplayPreference?: string;
}> {
  try {
    const resolved = await resolveConnectedAccountPaymentMethodConfiguration(stripeAccountId);
    return {
      configId: resolved.configId,
      boletoAvailable: resolved.boletoAvailable,
      boletoDisplayPreference: resolved.boletoDisplayPreference,
    };
  } catch {
    return { configId: null, boletoAvailable: false };
  }
}

async function resolveConnectedAccountPaymentMethodConfiguration(
  stripeAccountId: string
): Promise<{
  configId: string;
  boletoAvailable: boolean;
  boletoDisplayPreference?: string;
}> {
  const listed = await stripe.paymentMethodConfigurations.list(
    { limit: 100 },
    { stripeAccount: stripeAccountId }
  );

  if (!listed.data.length) {
    throw new Error(
      `Nenhuma configuração de formas de pagamento encontrada na conta conectada ${stripeAccountId}.`
    );
  }

  // Ordem: config da aplicação Connect, padrão, demais (pode haver PMC com boleto on em outra entrada).
  const ordered: typeof listed.data = [];
  const seen = new Set<string>();
  const push = (c: (typeof listed.data)[0]) => {
    if (!c.id || seen.has(c.id)) return;
    seen.add(c.id);
    ordered.push(c);
  };
  for (const c of listed.data) if (c.application) push(c);
  for (const c of listed.data) if (c.is_default) push(c);
  for (const c of listed.data) push(c);

  let fallbackConfigId: string | null = null;
  let fallbackDisplay: string | undefined;

  for (const config of ordered) {
    const pmc = await stripe.paymentMethodConfigurations.retrieve(
      config.id,
      {},
      { stripeAccount: stripeAccountId }
    );
    const { available, displayPreference } = readBoletoFromPmc(pmc);
    if (!fallbackConfigId) {
      fallbackConfigId = config.id;
      fallbackDisplay = displayPreference;
    }
    if (available) {
      return {
        configId: config.id,
        boletoAvailable: true,
        boletoDisplayPreference: displayPreference,
      };
    }
  }

  const primaryId =
    listed.data.find((c) => c.application)?.id ??
    listed.data.find((c) => c.is_default)?.id ??
    listed.data[0]?.id;

  if (primaryId) {
    try {
      const updated = await enableBoletoOnPaymentMethodConfiguration(primaryId, stripeAccountId);
      const { available, displayPreference } = readBoletoFromPmc(updated);
      if (available) {
        return {
          configId: primaryId,
          boletoAvailable: true,
          boletoDisplayPreference: displayPreference,
        };
      }
      fallbackConfigId = primaryId;
      fallbackDisplay = displayPreference;
    } catch (e) {
      console.warn('[boleto] Could not set boleto display_preference=on on PMC:', (e as Error)?.message);
    }
  }

  return {
    configId: fallbackConfigId ?? primaryId ?? listed.data[0].id!,
    boletoAvailable: false,
    boletoDisplayPreference: fallbackDisplay,
  };
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

  const { configId, boletoAvailable, boletoDisplayPreference } =
    await resolveConnectedAccountPaymentMethodConfiguration(stripeAccount);

  const sessionCore: Stripe.Checkout.SessionCreateParams = {
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
    payment_method_options: {
      boleto: { expires_after_days: 3 },
    },
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true, required: 'if_supported' },
    customer_creation: 'always',
  };

  const pmcHint =
    `pmc=${configId}, boleto.available=${boletoAvailable}, display=${boletoDisplayPreference ?? '?'}`;

  const attempts: Stripe.Checkout.SessionCreateParams[] = [];

  if (boletoAvailable) {
    attempts.push({ ...sessionCore, payment_method_configuration: configId });
  }

  // Capability active mas PMC com display off: Checkout só com boleto (sem PMC).
  attempts.push({ ...sessionCore, payment_method_types: ['boleto'] });

  if (!boletoAvailable) {
    attempts.push({ ...sessionCore, payment_method_configuration: configId });
  }

  let lastMessage = '';
  for (const sessionParams of attempts) {
    try {
      return await stripe.checkout.sessions.create(sessionParams, { stripeAccount });
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err);
      console.warn('[boleto] Checkout attempt failed:', lastMessage);
    }
  }

  throw new Error(
    `Não foi possível abrir checkout de boleto na conta ${stripeAccount}. ` +
      `Capability boleto_payments=${capabilityStatus}; ${pmcHint}. ` +
      'No Dashboard (live): Connect → Contas → esta conta → Formas de pagamento → ative Boleto (liga display_preference). ' +
      `Último erro Stripe: ${lastMessage}`
  );
}
