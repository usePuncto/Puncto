import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebaseAdmin';
import type { RollCallStatus } from '@/types/attendance';
import {
  authError,
  requireBusinessAuth,
  type BusinessActor,
} from '@/lib/auth/requireBusinessAuth';

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

/**
 * Quem pode marcar chamada nesta turma:
 * - Owner / manager / platform admin
 * - Professional vinculado à turma (professionalId)
 */
async function canManageAttendance(
  actor: BusinessActor,
  businessId: string,
  turmaId: string
): Promise<boolean> {
  if (actor.isPlatformAdmin) return true;
  if (actor.role === 'owner' || actor.role === 'manager') return true;

  if (actor.role === 'professional' && actor.professionalId) {
    const turmaSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('turmas')
      .doc(turmaId)
      .get();
    if (!turmaSnap.exists) return false;
    const turmaData = turmaSnap.data() as { professionalId?: string };
    return turmaData.professionalId === actor.professionalId;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpsertAttendanceBody;
    const { businessId, turmaId, studentId, date, status } = body;

    if (!businessId || !turmaId || !studentId || !date || !status) {
      return NextResponse.json(
        { error: 'businessId, turmaId, studentId, date e status sao obrigatorios' },
        { status: 400 },
      );
    }

    const authResult = await requireBusinessAuth(request, businessId);
    if (authError(authResult)) {
      return NextResponse.json(
        { error: 'Sessão inválida ou expirada. Faça login novamente.' },
        { status: authResult.error.status },
      );
    }

    if (!isIsoDate(date)) {
      return NextResponse.json({ error: 'Data invalida (use yyyy-MM-dd)' }, { status: 400 });
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Status de chamada invalido' }, { status: 400 });
    }

    const allowed = await canManageAttendance(authResult.actor, businessId, turmaId);
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            'Sem permissão para registrar chamada nesta turma. Se você foi promovida(o) recentemente, saia e entre de novo no painel.',
        },
        { status: 403 },
      );
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
