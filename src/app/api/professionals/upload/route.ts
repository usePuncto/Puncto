import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/lib/firebaseAdmin';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// POST - Upload professional photo to Firebase Storage
export async function POST(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const contentType = file.type;
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 }
      );
    }

    const storage = getStorage(adminApp);
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const bucketName =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      (projectId ? `${projectId}.appspot.com` : undefined);
    if (!bucketName) {
      return NextResponse.json({ error: 'Storage bucket not configured' }, { status: 500 });
    }
    const bucket = storage.bucket(bucketName);

    const ext = contentType.split('/')[1] || 'png';
    const path = `professionals/${businessId}/${Date.now()}.${ext}`;
    const storageFile = bucket.file(path);

    const buffer = Buffer.from(await file.arrayBuffer());
    await storageFile.save(buffer, { metadata: { contentType } });
    await storageFile.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('[professionals/upload] Error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
