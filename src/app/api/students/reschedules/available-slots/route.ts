import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';

type DecodedActor = {
  uid: string;
  userType?: string;
  studentBusinessId?: string;
};

async function getActor(request: NextRequest): Promise<DecodedActor | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  return (await auth.verifyIdToken(token)) as DecodedActor;
}

function turmaHasCapacity(studentIds: unknown, maxStudents: unknown) {
  const n = Array.isArray(studentIds) ? studentIds.length : 0;
  const max = typeof maxStudents === 'number' ? maxStudents : undefined;
  if (max == null || max <= 0) return true;
  return n < max;
}

/**
 * Lista turmas da unidade com vaga (abaixo de maxStudents) e respectivos horários de grade.
 * Usado pelo portal do aluno para escolher reposição em outra turma (sem expor todas as turmas no Firestore cliente).
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (actor.userType !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId obrigatorio' }, { status: 400 });
    }
    if (actor.studentBusinessId !== businessId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const businessSnap = await db.collection('businesses').doc(businessId).get();
    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Negocio nao encontrado' }, { status: 404 });
    }
    const industry = (businessSnap.data() as { industry?: string })?.industry;
    if (industry !== 'education') {
      return NextResponse.json({ error: 'Disponivel apenas para education' }, { status: 400 });
    }

    const turmasSnap = await db.collection('businesses').doc(businessId).collection('turmas').get();

    type TurmaRow = {
      turmaId: string;
      name: string;
      professionalId?: string;
      schedules: Array<{ weekday: number; startTime: string; endTime: string }>;
    };

    const turmas: TurmaRow[] = [];
    for (const docSnap of turmasSnap.docs) {
      const data = docSnap.data() as {
        name?: string;
        professionalId?: string;
        studentIds?: string[];
        maxStudents?: number;
        schedules?: Array<{ weekday?: number; startTime?: string; endTime?: string }>;
      };
      if (!turmaHasCapacity(data.studentIds, data.maxStudents)) continue;
      const schedules = (data.schedules || [])
        .filter(
          (s) =>
            typeof s.weekday === 'number' &&
            typeof s.startTime === 'string' &&
            typeof s.endTime === 'string',
        )
        .map((s) => ({
          weekday: s.weekday as number,
          startTime: s.startTime as string,
          endTime: s.endTime as string,
        }));
      if (schedules.length === 0) continue;
      turmas.push({
        turmaId: docSnap.id,
        name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : docSnap.id,
        professionalId: typeof data.professionalId === 'string' ? data.professionalId.trim() : undefined,
        schedules,
      });
    }

    return NextResponse.json({ turmas });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[students/reschedules/available-slots] Error:', error);
    return NextResponse.json({ error: err?.message || 'Falha ao listar horarios' }, { status: 500 });
  }
}
