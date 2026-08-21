import { NextRequest, NextResponse } from 'next/server';
import { syncManualTuitionDueNotifications } from '@/lib/server/manualTuitionNotifications';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

/** Atualiza status de atraso e cria notificações de vencimento para mensalidades manuais. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businessId = typeof body.businessId === 'string' ? body.businessId.trim() : '';
    if (!businessId) {
      return NextResponse.json({ error: 'businessId é obrigatório' }, { status: 400 });
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
      anyPermission: ['manageBookings', 'managePayments'],
    });
    if (authError(authResult)) return authResult.error;

    if ((authResult.business as { industry?: string }).industry !== 'education') {
      return NextResponse.json({ error: 'Disponível apenas para negócios de educação' }, { status: 403 });
    }

    const result = await syncManualTuitionDueNotifications(businessId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[manual-tuitions/sync POST]', error);
    return NextResponse.json({ error: 'Falha ao sincronizar mensalidades' }, { status: 500 });
  }
}
