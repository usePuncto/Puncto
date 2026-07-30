import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/firebaseAdmin';

const demoRequestSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  businessType: z.string().optional(),
  message: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  plan: z.string().optional(),
  modules: z.union([z.array(z.string()), z.string()]).optional(),
  industry: z.string().optional(),
  billing: z.enum(['monthly', 'annual']).optional(),
  page: z.string().optional(),
  subject: z.string().optional(),
});

function normalizeModules(modules: string[] | string | undefined): string[] {
  if (!modules) return [];
  if (Array.isArray(modules)) return modules.filter(Boolean);
  return modules.split(',').map((m) => m.trim()).filter(Boolean);
}

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
    const modules = normalizeModules(data.modules);

    // Get UTM parameters
    const utmSource = request.headers.get('x-utm-source') || body.utmSource || null;
    const utmMedium = request.headers.get('x-utm-medium') || body.utmMedium || null;
    const utmCampaign = request.headers.get('x-utm-campaign') || body.utmCampaign || null;

    // Store demo request in Firestore
    const demoRef = await db.collection('leads').add({
      type: 'demo_request',
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      company: data.company || null,
      businessType: data.businessType || null,
      message: data.message || null,
      subject: data.subject || 'Solicitação de demonstração',
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
      plan: data.plan || null,
      modules,
      industry: data.industry || null,
      billing: data.billing || null,
      source: {
        page: data.page || '/demo',
        utmSource,
        utmMedium,
        utmCampaign,
        referrer: request.headers.get('referer') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
      status: 'new',
      priority: 'high',
      assignedTo: null,
      notes: null,
      scheduledAt: null,
      followUpAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Also create in a dedicated demo_requests collection for sales team
    await db.collection('demo_requests').add({
      leadId: demoRef.id,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      company: data.company || null,
      businessType: data.businessType || null,
      message: data.message || null,
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
      plan: data.plan || null,
      modules,
      industry: data.industry || null,
      billing: data.billing || null,
      status: 'pending',
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
