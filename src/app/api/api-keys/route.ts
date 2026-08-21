import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { generateApiKey } from '@/lib/api/authentication';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// POST - Create API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, expiresAt } = body;

    if (!businessId || !name) {
      return NextResponse.json(
        { error: 'businessId and name are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    // Generate API key
    const { key, prefix, hashed } = generateApiKey();

    // Create API key document
    const apiKeyRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('apiKeys')
      .doc();

    const apiKey = {
      businessId,
      name,
      keyPrefix: prefix,
      hashedKey: hashed,
      active: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdAt: new Date(),
      createdBy: authResult.actor.uid,
    };

    await apiKeyRef.set(apiKey);

    // Return API key (only shown once on creation)
    return NextResponse.json(
      {
        id: apiKeyRef.id,
        name,
        key, // Return full key only on creation
        keyPrefix: prefix,
        active: true,
        expiresAt: expiresAt || null,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api-keys POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

// GET - List API keys for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const apiKeysSnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('apiKeys')
      .orderBy('createdAt', 'desc')
      .get();

    const apiKeys = apiKeysSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        keyPrefix: data.keyPrefix,
        active: data.active,
        lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString() || data.lastUsedAt,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        // Don't expose hashed key
      };
    });

    return NextResponse.json({ data: apiKeys });
  } catch (error) {
    console.error('[api-keys GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 }
    );
  }
}
