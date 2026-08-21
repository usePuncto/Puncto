import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { adminApp, db } from '@/lib/firebaseAdmin';
import {
  canManageFiscalNotes,
  requireFiscalNotesAuth,
} from '@/lib/fiscal-notes/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/fiscal-notes/[id]/upload
 * multipart: businessId, kind=xml|pdf, file
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const form = await request.formData();
    const businessId = String(form.get('businessId') || '');
    const kind = String(form.get('kind') || '');
    const file = form.get('file');

    if (!businessId || !['xml', 'pdf'].includes(kind)) {
      return NextResponse.json(
        { error: 'businessId and kind (xml|pdf) are required' },
        { status: 400 }
      );
    }
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const authResult = await requireFiscalNotesAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageFiscalNotes(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ref = db
      .collection('businesses')
      .doc(businessId)
      .collection('fiscalNotes')
      .doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo maior que 5MB' }, { status: 400 });
    }

    const contentType =
      file.type ||
      (kind === 'pdf' ? 'application/pdf' : 'application/xml');
    const ext = kind === 'pdf' ? 'pdf' : 'xml';
    const safeName = (file.name || `nota.${ext}`).replace(/[^\w.\-]+/g, '_');

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const bucketName =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      (projectId ? `${projectId}.appspot.com` : undefined);
    if (!bucketName) {
      return NextResponse.json({ error: 'Storage bucket not configured' }, { status: 500 });
    }

    const storagePath = `businesses/${businessId}/fiscal-notes/${id}/${kind}-${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = getStorage(adminApp).bucket(bucketName);
    const gcsFile = bucket.file(storagePath);
    await gcsFile.save(buffer, {
      contentType,
      metadata: { cacheControl: 'private, max-age=0' },
    });

    let downloadUrl: string;
    try {
      const [signed] = await gcsFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      downloadUrl = signed;
    } catch {
      downloadUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}`;
    }

    const updates =
      kind === 'pdf'
        ? {
            pdfStoragePath: storagePath,
            pdfDownloadUrl: downloadUrl,
            pdfFileName: safeName,
            updatedAt: new Date(),
          }
        : {
            xmlStoragePath: storagePath,
            xmlDownloadUrl: downloadUrl,
            xmlFileName: safeName,
            updatedAt: new Date(),
          };

    await ref.update(updates);

    return NextResponse.json({
      ok: true,
      kind,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[fiscal-notes upload]', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
