import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { auth, db } from '@/lib/firebaseAdmin';
import type { RollCallStatus } from '@/types/attendance';

type DecodedActor = {
  uid: string;
  userType?: string;
  platformAdmin?: boolean;
  businessRoles?: Record<string, string>;
  professionalId?: string;
};

type UpsertAttendanceBody = {
  businessId?: string;
  turmaId?: string;
  studentId?: string;
  date?: string;
  status?: RollCallStatus;
};

const ALLOWED_STATUS: RollCallStatus[] = ['present', 'absent', 'justified', 'pending'];

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function getActor(request: NextRequest): Promise<DecodedActor | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  return (await auth.verifyIdToken(token)) as DecodedActor;
}

/**
 * Professora não precisa ser admin: basta ser a profissional vinculada à turma (`turmas.professionalId`).
 * Resolve papel e `professionalId` a partir dos claims e, se faltar algo, do documento `staff`
 * (token às vezes não traz claims atualizados até o próximo refresh).
 */
async function canManageAttendance(uid: string, businessId: string, turmaId: string) {
  const user = await auth.getUser(uid);
  const claims = (user.customClaims || {}) as {
    businessRoles?: Record<string, string>;
    professionalId?: string;
    userType?: string;
    platformAdmin?: boolean;
  };

  if (claims.userType === 'platform_admin' && claims.platformAdmin === true) return true;

  const roleFromClaims = claims.businessRoles?.[businessId];
  if (roleFromClaims === 'owner' || roleFromClaims === 'manager') return true;

  const staffSnap = await db.collection('businesses').doc(businessId).collection('staff').doc(uid).get();
  const staff = staffSnap.data() as
    | { role?: string; professionalId?: string; active?: boolean; permissions?: Record<string, boolean> }
    | undefined;

  if (staff?.active === false) return false;

  const roleFromStaff = staff?.role;
  const role = roleFromClaims || roleFromStaff;
  if (role === 'owner' || role === 'manager') return true;

  const professionalId =
    (typeof claims.professionalId === 'string' && claims.professionalId) ||
    (typeof staff?.professionalId === 'string' && staff.professionalId) ||
    undefined;

  if (role === 'professional' && professionalId) {
    const turmaSnap = await db.collection('businesses').doc(businessId).collection('turmas').doc(turmaId).get();
    if (!turmaSnap.exists) return false;
    const turmaData = turmaSnap.data() as { professionalId?: string };
    return turmaData.professionalId === professionalId;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as UpsertAttendanceBody;
    const { businessId, turmaId, studentId, date, status } = body;

    if (!businessId || !turmaId || !studentId || !date || !status) {
      return NextResponse.json(
        { error: 'businessId, turmaId, studentId, date e status sao obrigatorios' },
        { status: 400 },
      );
    }

    if (!isIsoDate(date)) {
      return NextResponse.json({ error: 'Data invalida (use yyyy-MM-dd)' }, { status: 400 });
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Status de chamada invalido' }, { status: 400 });
    }

    const allowed = await canManageAttendance(actor.uid, businessId, turmaId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const recordId = `${turmaId}_${date}_${studentId}`;
    const now = Timestamp.now();
    await db.collection('businesses').doc(businessId).collection('attendanceRollCalls').doc(recordId).set(
      {
        businessId,
        turmaId,
        studentId,
        date,
        status,
        markedAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    return NextResponse.json({ success: true, id: recordId });
  } catch (error) {
    console.error('[attendance/roll-call] Error:', error);
    return NextResponse.json({ error: 'Falha ao registrar chamada' }, { status: 500 });
  }
}

