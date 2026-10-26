import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

// Resposta pública (id/slug/status do negócio, sem dados de usuário): pode ficar na CDN.
// A query `key` faz parte da chave de cache, então cada host tem sua própria entrada.
const PUBLIC_CACHE_HEADERS = { 'Cache-Control': 'public, max-age=0, s-maxage=30' };

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
        return NextResponse.json({ error: 'not found' }, { status: 404, headers: PUBLIC_CACHE_HEADERS });
      }
      const data = doc.data() as { slug?: string; subscription?: { status?: string } };
      const slug = (typeof data.slug === 'string' && data.slug.trim()) || key;
      return NextResponse.json(
        {
          id: doc.id,
          slug,
          subscriptionStatus: data.subscription?.status ?? null,
        },
        { headers: PUBLIC_CACHE_HEADERS },
      );
    }

    const snap = await db.collection('businesses').where('slug', '==', key).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: 'not found' }, { status: 404, headers: PUBLIC_CACHE_HEADERS });
    }
    const doc = snap.docs[0];
    const data = doc.data() as { slug?: string; subscription?: { status?: string } };
    const slug = (typeof data.slug === 'string' && data.slug.trim()) || key;
    return NextResponse.json(
      {
        id: doc.id,
        slug,
        subscriptionStatus: data.subscription?.status ?? null,
      },
      { headers: PUBLIC_CACHE_HEADERS },
    );
  } catch (e) {
    console.error('[api/tenant/resolve-host]', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
