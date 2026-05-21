/**
 * Business subscription states that block staff/customer portal access.
 */
export const BLOCKED_SUBSCRIPTION_STATUSES = ['suspended', 'cancelled'] as const;

export type BlockedSubscriptionStatus = (typeof BLOCKED_SUBSCRIPTION_STATUSES)[number];

export function isSubscriptionAccessBlocked(
  status?: string | null
): status is BlockedSubscriptionStatus {
  if (!status) return false;
  return (BLOCKED_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

export const SUBSCRIPTION_ENDED_TITLE = 'Assinatura encerrada';

export const SUBSCRIPTION_ENDED_MESSAGE =
  'A assinatura deste negócio foi encerrada. Entre em contato com o suporte da Puncto para reativar o acesso.';

export const SUBSCRIPTION_ENDED_SUPPORT_HINT = 'suporte@puncto.com.br';
