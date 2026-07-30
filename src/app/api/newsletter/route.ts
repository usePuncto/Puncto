import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/firebaseAdmin';

const newsletterSchema = z.object({
  email: z.string().email('Email inválido'),
});

export async function POST(request: NextRequest) {
  try {
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

    // Check if email already exists
    const existingSubscriber = await db
      .collection('newsletter_subscribers')
      .where('email', '==', email.toLowerCase())
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
      email: email.toLowerCase(),
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
      email: email.toLowerCase(),
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

    // TODO: Send welcome email
    // await sendEmail({
    //   to: email,
    //   template: 'newsletter_welcome',
    //   data: { ... }
    // });

    // TODO: Add to email marketing platform (Mailchimp, SendGrid, etc.)
    // await emailMarketing.addSubscriber(email);

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

// Unsubscribe endpoint
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

    // TODO: Remove from email marketing platform
    // await emailMarketing.removeSubscriber(email);

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
