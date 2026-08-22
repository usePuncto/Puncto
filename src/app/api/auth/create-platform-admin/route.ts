import { NextRequest, NextResponse } from 'next/server';
import { createPlatformAdmin } from '@/lib/auth/create-user';
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/api/ipRateLimit';
import { safeEqualString } from '@/lib/crypto/safeCompare';

/**
 * POST /api/auth/create-platform-admin
 *
 * Disabled in production unless PLATFORM_ADMIN_CREATE_ENABLED=true.
 * Requires PLATFORM_ADMIN_CREATE_SECRET (≥32 chars) compared in constant time.
 */
export async function POST(request: NextRequest) {
  try {
    const enabledExplicitly = process.env.PLATFORM_ADMIN_CREATE_ENABLED === 'true';
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd && !enabledExplicitly) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ip = clientIpFromRequest(request);
    const limit = checkIpRateLimit(`create-platform-admin:${ip}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }

    const PLATFORM_ADMIN_SECRET = process.env.PLATFORM_ADMIN_CREATE_SECRET?.trim() || '';

    if (!PLATFORM_ADMIN_SECRET || PLATFORM_ADMIN_SECRET.length < 32) {
      return NextResponse.json(
        {
          error:
            'Platform admin creation is disabled. Set a PLATFORM_ADMIN_CREATE_SECRET of at least 32 characters.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, password, displayName, role, secretKey } = body as {
      email?: string;
      password?: string;
      displayName?: string;
      role?: string;
      secretKey?: string;
    };

    if (typeof secretKey !== 'string' || !safeEqualString(secretKey, PLATFORM_ADMIN_SECRET)) {
      return NextResponse.json({ error: 'Invalid secret key' }, { status: 403 });
    }

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, displayName' },
        { status: 400 }
      );
    }

    const validRoles: Array<'super_admin' | 'support' | 'analyst'> = [
      'super_admin',
      'support',
      'analyst',
    ];
    const adminRole =
      role && validRoles.includes(role as (typeof validRoles)[number])
        ? (role as (typeof validRoles)[number])
        : 'analyst';

    const result = await createPlatformAdmin({
      email,
      password,
      displayName,
      role: adminRole,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Platform admin created successfully',
        userId: result.userId,
        user: {
          email: result.user.email,
          displayName: result.user.displayName,
          type: result.user.type,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[API] Error creating platform admin:', error);

    const code = (error as { code?: string })?.code;
    if (code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : 'Failed to create platform admin';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
