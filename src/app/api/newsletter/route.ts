import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/firebaseAdmin';
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/api/ipRateLimit';

const newsletterSchema = z.object({
  email: z.string().email('Email inválido'),
});

function unsubscribeSecret(): string {
  const secret =
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.CALENDAR_LINK_SECRET?.trim();
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV !== 'production') {
    return 'puncto-dev-newsletter-secret';
  }
  throw new Error('NEWSLETTER_UNSUBSCRIBE_SECRET or CALENDAR_LINK_SECRET required');
}

export function signNewsletterUnsubscribeToken(email: string): string {
  return createHmac('sha256', unsubscribeSecret())
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

function verifyUnsubscribeToken(email: string, token: string | null): boolean {
  if (!token || token.length < 16) return false;
  try {
    const expected = signNewsletterUnsubscribeToken(email);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(token, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limit = checkIpRateLimit(`newsletter:${ip}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();

    // Validate input
    const result = newsletterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const emailNorm = email.toLowerCase();

    // Check if email already exists
    const existingSubscriber = await db
      .collection('newsletter_subscribers')
      .where('email', '==', emailNorm)
      .limit(1)
      .get();

    if (!existingSubscriber.empty) {
      // Already subscribed, just return success
      return NextResponse.json({
        success: true,
        message: 'Você já está inscrito em nossa newsletter',
        alreadySubscribed: true,
      });
    }

    // Get UTM parameters
    const utmSource = request.headers.get('x-utm-source') || null;
    const utmMedium = request.headers.get('x-utm-medium') || null;
    const utmCampaign = request.headers.get('x-utm-campaign') || null;

    // Store newsletter subscription
    await db.collection('newsletter_subscribers').add({
      email: emailNorm,
      status: 'active',
      source: {
        utmSource,
        utmMedium,
        utmCampaign,
        referrer: request.headers.get('referer') || null,
      },
      subscribedAt: new Date(),
      confirmedAt: null, // Will be set after double opt-in confirmation
      unsubscribedAt: null,
    });

    // Also add to leads collection for marketing follow-up
    await db.collection('leads').add({
      type: 'newsletter',
      email: emailNorm,
      name: null,
      phone: null,
      company: null,
      message: null,
      subject: 'Inscrição newsletter',
      source: {
        page: body.page || '/newsletter',
        utmSource,
        utmMedium,
        utmCampaign,
        referrer: request.headers.get('referer') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
      status: 'new',
      priority: 'normal',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Inscrição realizada com sucesso',
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Unsubscribe endpoint — requires HMAC token derived from email
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    if (!verifyUnsubscribeToken(email, token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find subscriber
    const subscriberQuery = await db
      .collection('newsletter_subscribers')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (subscriberQuery.empty) {
      return NextResponse.json({
        success: true,
        message: 'Email não encontrado na lista',
      });
    }

    // Update subscriber status
    const subscriberDoc = subscriberQuery.docs[0];
    await subscriberDoc.ref.update({
      status: 'unsubscribed',
      unsubscribedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Inscrição cancelada com sucesso',
    });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
