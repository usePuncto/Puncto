import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { syncManualTuitionDueNotifications } from '@/lib/server/manualTuitionNotifications';

async function getActor(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  return auth.verifyIdToken(token);
}

async function canManageFinancial(uid: string, businessId: string) {
  const user = await auth.getUser(uid);
  const claims = user.customClaims as
    | { businessRoles?: Record<string, string>; userType?: string; platformAdmin?: boolean }
    | undefined;
  if (claims?.userType === 'platform_admin' && claims.platformAdmin === true) return true;
  const role = claims?.businessRoles?.[businessId];
  if (role === 'owner' || role === 'manager') return true;
  const staffSnap = await db.collection('businesses').doc(businessId).collection('staff').doc(uid).get();
  const perms = staffSnap.data()?.permissions as Record<string, boolean> | undefined;
  return Boolean(perms?.manageBookings || perms?.managePayments);
}

/** Atualiza status de atraso e cria notificações de vencimento para mensalidades manuais. */
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const businessId = typeof body.businessId === 'string' ? body.businessId.trim() : '';
    if (!businessId) {
      return NextResponse.json({ error: 'businessId é obrigatório' }, { status: 400 });
    }

    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 });
    }
    if (businessDoc.data()?.industry !== 'education') {
      return NextResponse.json({ error: 'Disponível apenas para negócios de educação' }, { status: 403 });
    }

    const allowed = await canManageFinancial(actor.uid, businessId);
    if (!allowed) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const result = await syncManualTuitionDueNotifications(businessId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[manual-tuitions/sync POST]', error);
    return NextResponse.json({ error: 'Falha ao sincronizar mensalidades' }, { status: 500 });
  }
}
