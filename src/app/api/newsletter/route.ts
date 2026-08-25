import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/firebaseAdmin';
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/api/ipRateLimit';
import { verifyNewsletterUnsubscribeToken } from '@/lib/newsletter/unsubscribe-token';

const newsletterSchema = z.object({
  email: z.string().email('Email inválido'),
});

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limit = await checkIpRateLimit(`newsletter:${ip}`, {
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

    const result = newsletterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const emailNorm = email.toLowerCase();

    const existingSubscriber = await db
      .collection('newsletter_subscribers')
      .where('email', '==', emailNorm)
      .limit(1)
      .get();

    if (!existingSubscriber.empty) {
      return NextResponse.json({
        success: true,
        message: 'Você já está inscrito em nossa newsletter',
        alreadySubscribed: true,
      });
    }

    const utmSource = request.headers.get('x-utm-source') || null;
    const utmMedium = request.headers.get('x-utm-medium') || null;
    const utmCampaign = request.headers.get('x-utm-campaign') || null;

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
      confirmedAt: null,
      unsubscribedAt: null,
    });

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

    if (!verifyNewsletterUnsubscribeToken(email, token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
