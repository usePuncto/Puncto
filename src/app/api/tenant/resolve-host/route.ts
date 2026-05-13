import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

/** Alinha com `getCurrentBusiness` em `lib/tenant.ts` (slug vs id Firestore). */
function looksLikeDocId(value: string): boolean {
  return /^[a-zA-Z0-9]{19,21}$/.test(value);
}

/**
 * Resolve o rótulo do host (`{slug}.gestao...` ou id Firestore) para `{ id, slug }`.
 * Usado pelo middleware: `businessRoles` nos JWT usa id do negócio, o host usa slug.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')?.trim();
  if (!key) {
    return NextResponse.json({ error: 'key é obrigatório' }, { status: 400 });
  }

  try {
    if (looksLikeDocId(key)) {
      const doc = await db.collection('businesses').doc(key).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
      }
      const data = doc.data() as { slug?: string };
      const slug = (typeof data.slug === 'string' && data.slug.trim()) || key;
      return NextResponse.json({ id: doc.id, slug });
    }

    const snap = await db.collection('businesses').where('slug', '==', key).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    const doc = snap.docs[0];
    const data = doc.data() as { slug?: string };
    const slug = (typeof data.slug === 'string' && data.slug.trim()) || key;
    return NextResponse.json({ id: doc.id, slug });
  } catch (e) {
    console.error('[api/tenant/resolve-host]', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
