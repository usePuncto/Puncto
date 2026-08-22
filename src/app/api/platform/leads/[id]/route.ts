import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';

async function verifyPlatformAdmin(request: NextRequest): Promise<{ uid: string } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      if (decodedToken.platformAdmin === true) {
        return { uid: decodedToken.uid };
      }
    } else {
      const cookies = request.cookies.getAll();
      const sessionCookie = cookies.find(
        (c) => c.name === '__session'
      );
      if (sessionCookie) {
        const decoded = await auth.verifySessionCookie(sessionCookie.value, true);
        if (decoded.platformAdmin === true) {
          return { uid: decoded.uid };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * PATCH /api/platform/leads/[id]
 * Update lead status / notes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const leadRef = db.collection('leads').doc(params.id);
    const snap = await leadRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof body.status === 'string') {
      updates.status = body.status;
    }
    if (typeof body.notes === 'string') {
      updates.notes = body.notes;
    }
    if (typeof body.assignedTo === 'string' || body.assignedTo === null) {
      updates.assignedTo = body.assignedTo;
    }
    if (typeof body.priority === 'string') {
      updates.priority = body.priority;
    }

    await leadRef.update(updates);

    const updated = await leadRef.get();
    const data = updated.data() || {};

    return NextResponse.json({
      id: updated.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || null,
    });
  } catch (error: unknown) {
    console.error('[Platform API] Error updating lead:', error);
    const message = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
