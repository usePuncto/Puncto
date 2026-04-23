export { POST } from '@/app/api/payments/webhook/route';

/**
 * Mantém compatibilidade com integrações que já apontam para `/api/webhooks/stripe`,
 * mas delega para o handler unificado em `/api/payments/webhook`.
 */
export const dynamic = 'force-dynamic';
