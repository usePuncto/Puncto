import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/firebaseAdmin';

const demoRequestSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  businessType: z.enum(['salon', 'restaurant', 'clinic', 'bakery', 'other', '']).optional(),
  message: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = demoRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Get UTM parameters
    const utmSource = request.headers.get('x-utm-source') || body.utmSource || null;
    const utmMedium = request.headers.get('x-utm-medium') || body.utmMedium || null;
    const utmCampaign = request.headers.get('x-utm-campaign') || body.utmCampaign || null;

    // Store demo request in Firestore
    const demoRef = await db.collection('leads').add({
      type: 'demo_request',
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
      businessType: data.businessType || null,
      message: data.message || null,
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
      source: {
        utmSource,
        utmMedium,
        utmCampaign,
        referrer: request.headers.get('referer') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
      status: 'new',
      priority: 'high', // Demo requests are high priority
      assignedTo: null,
      scheduledAt: null,
      followUpAt: null,
      createdAt: new Date(),
    });

    // Also create in a dedicated demo_requests collection for sales team
    await db.collection('demo_requests').add({
      leadId: demoRef.id,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
      businessType: data.businessType || null,
      message: data.message || null,
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
      status: 'pending', // pending, scheduled, completed, cancelled, no_show
      scheduledAt: null,
      completedAt: null,
      notes: null,
      assignedTo: null,
      createdAt: new Date(),
    });

    // TODO: Send confirmation email to the user
    // await sendEmail({
    //   to: data.email,
    //   template: 'demo_request_confirmation',
    //   data: {
    //     name: data.name,
    //     ...
    //   }
    // });

    // TODO: Send notification to sales team
    // await sendEmail({
    //   to: 'suporte@puncto.com.br',
    //   subject: `Nova solicitação de demo: ${data.name} - ${data.company}`,
    //   body: `...`
    // });

    // TODO: Send Slack/Teams notification
    // await slackNotification({
    //   channel: '#sales',
    //   message: `New demo request from ${data.name}`,
    // });

    // TODO: Add to CRM with demo request tag
    // await crmIntegration.createDeal({
    //   contact: data,
    //   dealType: 'demo',
    //   priority: 'high',
    // });

    return NextResponse.json({
      success: true,
      message: 'Solicitação de demonstração enviada com sucesso',
      id: demoRef.id,
    });
  } catch (error) {
    console.error('Demo request error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Get demo requests (for internal use / admin)
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check for admin access
    // const user = await getCurrentUser(request);
    // if (!user || !user.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = db.collection('demo_requests').orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.limit(limit).get();

    const demoRequests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      scheduledAt: doc.data().scheduledAt?.toDate?.()?.toISOString() || null,
      completedAt: doc.data().completedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      data: demoRequests,
      count: demoRequests.length,
    });
  } catch (error) {
    console.error('Get demo requests error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
