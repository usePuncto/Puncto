import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { notifyLessonRescheduleRequestCreated } from '@/lib/server/lessonRescheduleNotifications';

type Action =
  | 'create_request'
  | 'cancel_request'
  | 'approve_request'
  | 'reject_request';

type DecodedActor = {
  uid: string;
  userType?: string;
  platformAdmin?: boolean;
  businessRoles?: Record<string, string>;
  professionalId?: string;
  studentBusinessId?: string;
  studentCustomerId?: string;
};

type ManageBody = {
  action?: Action;
  businessId?: string;
  attendanceRollCallId?: string;
  /** Turma onde o aluno quer a reposição (grade/horário). Default: turma da falta. */
  targetTurmaId?: string;
  requestId?: string;
  requestedDate?: string;
  requestedStartTime?: string;
  requestedEndTime?: string;
  professionalId?: string;
  reason?: string;
  reviewNote?: string;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function turmaHasCapacity(studentIds: unknown, maxStudents: unknown) {
  const n = Array.isArray(studentIds) ? studentIds.length : 0;
  const max = typeof maxStudents === 'number' ? maxStudents : undefined;
  if (max == null || max <= 0) return true;
  return n < max;
}

function isBlockedByUnavailability(
  date: string,
  startMinutes: number,
  endMinutes: number,
  entries?: Array<{ date?: string; startTime?: string; endTime?: string; allDay?: boolean }>,
) {
  if (!Array.isArray(entries)) return false;
  return entries.some((entry) => {
    if (!entry || entry.date !== date) return false;
    if (entry.allDay) return true;
    if (!entry.startTime || !entry.endTime) return false;
    const blockStart = timeToMinutes(entry.startTime);
    const blockEnd = timeToMinutes(entry.endTime);
    return rangesOverlap(startMinutes, endMinutes, blockStart, blockEnd);
  });
}

async function getActor(request: NextRequest): Promise<DecodedActor | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  return (await auth.verifyIdToken(token)) as DecodedActor;
}

async function canManageByStaff(uid: string, businessId: string) {
  const user = await auth.getUser(uid);
  const claims = user.customClaims as
    | {
        businessRoles?: Record<string, string>;
        userType?: string;
        platformAdmin?: boolean;
        professionalId?: string;
      }
    | undefined;
  if (claims?.userType === 'platform_admin' && claims.platformAdmin === true) {
    return { allowed: true, role: 'platform_admin' as const, professionalId: undefined };
  }
  const role = claims?.businessRoles?.[businessId];
  if (role === 'owner' || role === 'manager') {
    return { allowed: true, role: role as 'owner' | 'manager', professionalId: claims?.professionalId };
  }
  if (role === 'professional') {
    const staffSnap = await db.collection('businesses').doc(businessId).collection('staff').doc(uid).get();
    const hasManageBookings = Boolean(
      (staffSnap.data()?.permissions as Record<string, boolean> | undefined)?.manageBookings,
    );
    return {
      allowed: hasManageBookings || !!claims?.professionalId,
      role: 'professional' as const,
      professionalId: claims?.professionalId,
    };
  }
  return { allowed: false, role: null, professionalId: undefined };
}

async function findPendingRequestByAttendance(businessId: string, attendanceRollCallId: string) {
  const snap = await db
    .collection('businesses')
    .doc(businessId)
    .collection('lessonRescheduleRequests')
    .where('attendanceRollCallId', '==', attendanceRollCallId)
    .get();
  return snap.docs.find((docSnap) => docSnap.data()?.status === 'pending');
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as ManageBody;
    const { action, businessId } = body;
    if (!action || !businessId) {
      return NextResponse.json({ error: 'action e businessId sao obrigatorios' }, { status: 400 });
    }

    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) {
      return NextResponse.json({ error: 'Negocio nao encontrado' }, { status: 404 });
    }
    const businessData = businessSnap.data() as {
      industry?: string;
      displayName?: string;
      settings?: { currency?: string; unavailability?: Array<{ date?: string; startTime?: string; endTime?: string; allDay?: boolean }> };
    };
    if (businessData.industry !== 'education') {
      return NextResponse.json({ error: 'Disponivel apenas para education' }, { status: 400 });
    }

    const isStudent = actor.userType === 'student';
    const staffAccess = isStudent
      ? { allowed: false, role: null as null, professionalId: undefined as string | undefined }
      : await canManageByStaff(actor.uid, businessId);

    if (action === 'create_request') {
      if (!isStudent || actor.studentBusinessId !== businessId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { attendanceRollCallId, requestedDate, requestedStartTime, requestedEndTime } = body;
      if (!attendanceRollCallId || !requestedDate || !requestedStartTime || !requestedEndTime) {
        return NextResponse.json(
          { error: 'attendanceRollCallId, requestedDate, requestedStartTime e requestedEndTime sao obrigatorios' },
          { status: 400 },
        );
      }
      if (!isIsoDate(requestedDate) || !isTime(requestedStartTime) || !isTime(requestedEndTime)) {
        return NextResponse.json({ error: 'Data/horario invalido' }, { status: 400 });
      }
      if (timeToMinutes(requestedStartTime) >= timeToMinutes(requestedEndTime)) {
        return NextResponse.json({ error: 'Horario inicial deve ser menor que o final' }, { status: 400 });
      }

      const studentId = actor.studentCustomerId;
      if (!studentId) return NextResponse.json({ error: 'Conta sem vinculo de aluno' }, { status: 400 });

      const attendanceRef = businessRef.collection('attendanceRollCalls').doc(attendanceRollCallId);
      const attendanceSnap = await attendanceRef.get();
      if (!attendanceSnap.exists) return NextResponse.json({ error: 'Falta nao encontrada' }, { status: 404 });
      const attendance = attendanceSnap.data() as {
        status?: string;
        studentId?: string;
        turmaId?: string;
        date?: string;
      };
      if (attendance.studentId !== studentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (attendance.status !== 'absent') {
        return NextResponse.json({ error: 'Apenas faltas podem ser remarcadas' }, { status: 409 });
      }
      if (!attendance.turmaId || !attendance.date) {
        return NextResponse.json({ error: 'Registro de falta invalido' }, { status: 400 });
      }

      const existingPending = await findPendingRequestByAttendance(businessId, attendanceRollCallId);
      if (existingPending) {
        return NextResponse.json(
          { error: 'Ja existe uma solicitacao pendente para esta falta' },
          { status: 409 },
        );
      }

      const targetTurmaId =
        typeof body.targetTurmaId === 'string' && body.targetTurmaId.trim()
          ? body.targetTurmaId.trim()
          : attendance.turmaId;
      if (!targetTurmaId) {
        return NextResponse.json({ error: 'Turma alvo invalida' }, { status: 400 });
      }

      const turmaRef = businessRef.collection('turmas').doc(targetTurmaId);
      const turmaSnap = await turmaRef.get();
      if (!turmaSnap.exists) return NextResponse.json({ error: 'Turma nao encontrada' }, { status: 404 });
      const turmaData = turmaSnap.data() as {
        name?: string;
        studentIds?: string[];
        professionalId?: string;
        maxStudents?: number;
        schedules?: Array<{ weekday?: number; startTime?: string; endTime?: string }>;
      };
      const turmaDisplayName =
        typeof turmaData.name === 'string' && turmaData.name.trim() ? turmaData.name.trim() : 'Turma';

      if (!turmaHasCapacity(turmaData.studentIds, turmaData.maxStudents)) {
        return NextResponse.json({ error: 'Turma sem vagas para reposicao' }, { status: 409 });
      }

      const enrolledInTarget =
        Array.isArray(turmaData.studentIds) && turmaData.studentIds.includes(studentId);
      if (targetTurmaId === attendance.turmaId) {
        if (!enrolledInTarget) {
          return NextResponse.json({ error: 'Aluno nao pertence a esta turma' }, { status: 403 });
        }
      }

      const requestedWeekday = new Date(`${requestedDate}T12:00:00`).getDay();
      const scheduleMatch = (turmaData.schedules || []).some(
        (slot) =>
          slot.weekday === requestedWeekday &&
          slot.startTime === requestedStartTime &&
          slot.endTime === requestedEndTime,
      );
      if (!scheduleMatch) {
        return NextResponse.json(
          { error: 'Escolha um horario que exista na grade da turma' },
          { status: 400 },
        );
      }

      const now = Timestamp.now();
      const requestRef = businessRef.collection('lessonRescheduleRequests').doc();
      const professionalId = body.professionalId?.trim() || turmaData.professionalId || undefined;
      await requestRef.set({
        businessId,
        attendanceRollCallId,
        turmaId: targetTurmaId,
        studentId,
        requestedDate,
        requestedStartTime,
        requestedEndTime,
        ...(professionalId ? { professionalId } : {}),
        status: 'pending',
        requestedByUserId: actor.uid,
        reason: typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null,
        createdAt: now,
        updatedAt: now,
      });

      await attendanceRef.set(
        {
          replacementRequestIds: FieldValue.arrayUnion(requestRef.id),
          updatedAt: now,
        },
        { merge: true },
      );

      try {
        const customerSnap = await businessRef.collection('customers').doc(studentId).get();
        const cust = customerSnap.data() as { firstName?: string; lastName?: string } | undefined;
        await notifyLessonRescheduleRequestCreated({
          businessId,
          requestId: requestRef.id,
          turmaName: turmaDisplayName,
          professionalId,
          customerFirstName: cust?.firstName,
          customerLastName: cust?.lastName,
          requestedDate,
          requestedStartTime,
        });
      } catch (notifyErr) {
        console.error('[students/reschedules/manage] notifyLessonRescheduleRequestCreated', notifyErr);
      }

      return NextResponse.json({ success: true, requestId: requestRef.id });
    }

    if (action === 'cancel_request') {
      if (!isStudent || actor.studentBusinessId !== businessId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { requestId } = body;
      if (!requestId) return NextResponse.json({ error: 'requestId obrigatorio' }, { status: 400 });

      const reqRef = businessRef.collection('lessonRescheduleRequests').doc(requestId);
      const reqSnap = await reqRef.get();
      if (!reqSnap.exists) return NextResponse.json({ error: 'Solicitacao nao encontrada' }, { status: 404 });
      const reqData = reqSnap.data() as { studentId?: string; status?: string };
      if (reqData.studentId !== actor.studentCustomerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (reqData.status !== 'pending') {
        return NextResponse.json({ error: 'Apenas solicitacoes pendentes podem ser canceladas' }, { status: 409 });
      }

      await reqRef.set(
        {
          status: 'cancelled_by_student',
          reviewNote: 'Cancelado pelo aluno',
          reviewedByUserId: actor.uid,
          reviewedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
      return NextResponse.json({ success: true });
    }

    if (action === 'approve_request' || action === 'reject_request') {
      if (!staffAccess.allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { requestId } = body;
      if (!requestId) return NextResponse.json({ error: 'requestId obrigatorio' }, { status: 400 });

      const reqRef = businessRef.collection('lessonRescheduleRequests').doc(requestId);
      const reqSnap = await reqRef.get();
      if (!reqSnap.exists) return NextResponse.json({ error: 'Solicitacao nao encontrada' }, { status: 404 });
      const reqData = reqSnap.data() as {
        status?: string;
        turmaId?: string;
        studentId?: string;
        requestedDate?: string;
        requestedStartTime?: string;
        requestedEndTime?: string;
        professionalId?: string;
      };

      if (reqData.status !== 'pending') {
        return NextResponse.json({ error: 'Solicitacao nao esta pendente' }, { status: 409 });
      }
      if (
        !reqData.turmaId ||
        !reqData.studentId ||
        !reqData.requestedDate ||
        !reqData.requestedStartTime ||
        !reqData.requestedEndTime
      ) {
        return NextResponse.json({ error: 'Solicitacao invalida' }, { status: 400 });
      }

      const turmaSnap = await businessRef.collection('turmas').doc(reqData.turmaId).get();
      if (!turmaSnap.exists) return NextResponse.json({ error: 'Turma nao encontrada' }, { status: 404 });
      const turmaData = turmaSnap.data() as { name?: string; professionalId?: string };

      const targetProfessionalId = reqData.professionalId || turmaData.professionalId;
      if (staffAccess.role === 'professional') {
        if (!staffAccess.professionalId || targetProfessionalId !== staffAccess.professionalId) {
          return NextResponse.json(
            { error: 'Profissional pode revisar apenas remarcacoes das suas turmas' },
            { status: 403 },
          );
        }
      }

      if (action === 'reject_request') {
        await reqRef.set(
          {
            status: 'rejected',
            reviewNote: typeof body.reviewNote === 'string' && body.reviewNote.trim() ? body.reviewNote.trim() : null,
            reviewedByUserId: actor.uid,
            reviewedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );
        return NextResponse.json({ success: true });
      }

      if (!targetProfessionalId) {
        return NextResponse.json({ error: 'Turma sem professor vinculado para reposicao' }, { status: 409 });
      }

      const customerSnap = await businessRef.collection('customers').doc(reqData.studentId).get();
      if (!customerSnap.exists) return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 });
      const customerData = customerSnap.data() as {
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string;
      };

      const professionalSnap = await businessRef.collection('professionals').doc(targetProfessionalId).get();
      if (!professionalSnap.exists) return NextResponse.json({ error: 'Professor nao encontrado' }, { status: 404 });
      const professionalData = professionalSnap.data() as { name?: string; unavailability?: Array<{ date?: string; startTime?: string; endTime?: string; allDay?: boolean }> };

      const startMinutes = timeToMinutes(reqData.requestedStartTime);
      const endMinutes = timeToMinutes(reqData.requestedEndTime);
      const durationMinutes = endMinutes - startMinutes;
      if (durationMinutes <= 0) {
        return NextResponse.json({ error: 'Horario solicitado invalido' }, { status: 400 });
      }

      const scheduledDateTime = new Date(`${reqData.requestedDate}T${reqData.requestedStartTime}:00`);
      const endDateTime = new Date(`${reqData.requestedDate}T${reqData.requestedEndTime}:00`);

      if (
        isBlockedByUnavailability(
          reqData.requestedDate,
          startMinutes,
          endMinutes,
          businessData.settings?.unavailability,
        ) ||
        isBlockedByUnavailability(
          reqData.requestedDate,
          startMinutes,
          endMinutes,
          professionalData.unavailability,
        )
      ) {
        return NextResponse.json(
          { error: 'Horario indisponivel por bloqueio na agenda' },
          { status: 409 },
        );
      }

      const bookingDaySnap = await businessRef
        .collection('bookings')
        .where('scheduledDate', '==', reqData.requestedDate)
        .get();
      const hasConflict = bookingDaySnap.docs.some((docSnap) => {
        const booking = docSnap.data() as {
          professionalId?: string;
          status?: string;
          scheduledTime?: string;
          durationMinutes?: number;
        };
        if (booking.professionalId !== targetProfessionalId) return false;
        if (!['pending', 'confirmed'].includes(booking.status || '')) return false;
        if (!booking.scheduledTime) return false;
        const otherStart = timeToMinutes(booking.scheduledTime);
        const otherEnd = otherStart + (booking.durationMinutes || 60);
        return rangesOverlap(startMinutes, endMinutes, otherStart, otherEnd);
      });
      if (hasConflict) {
        return NextResponse.json({ error: 'Horario indisponivel para este professor' }, { status: 409 });
      }

      const bookingRef = businessRef.collection('bookings').doc();
      const now = Timestamp.now();
      await bookingRef.set({
        businessId,
        serviceId: 'lesson_reschedule',
        serviceName: `Reposicao - ${turmaData.name || 'Turma'}`,
        professionalId: targetProfessionalId,
        professionalName: professionalData.name || 'Professor',
        locationId: 'education',
        locationName: businessData.displayName || 'Unidade',
        scheduledDate: reqData.requestedDate,
        scheduledTime: reqData.requestedStartTime,
        scheduledDateTime: Timestamp.fromDate(scheduledDateTime),
        durationMinutes,
        endDateTime: Timestamp.fromDate(endDateTime),
        customerId: reqData.studentId,
        customerData: {
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          phone: customerData.phone || '',
          email: customerData.email || '',
        },
        status: 'confirmed',
        price: 0,
        currency: businessData.settings?.currency || 'brl',
        reminders: {},
        customFields: {
          lessonRescheduleRequestId: requestId,
          turmaId: reqData.turmaId,
          isLessonReplacement: true,
        },
        notes: 'Aula de reposicao aprovada via portal do aluno',
        createdBy: actor.uid,
        createdAt: now,
        updatedAt: now,
      });

      await reqRef.set(
        {
          status: 'approved',
          approvedAt: now,
          approvedByUserId: actor.uid,
          reviewedByUserId: actor.uid,
          reviewedAt: now,
          reviewNote: typeof body.reviewNote === 'string' && body.reviewNote.trim() ? body.reviewNote.trim() : null,
          replacementBookingId: bookingRef.id,
          professionalId: targetProfessionalId,
          updatedAt: now,
        },
        { merge: true },
      );

      return NextResponse.json({ success: true, replacementBookingId: bookingRef.id });
    }

    return NextResponse.json({ error: 'Acao invalida' }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[students/reschedules/manage] Error:', error);
    return NextResponse.json({ error: err?.message || 'Falha ao processar remarcacao' }, { status: 500 });
  }
}
