import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/firebaseAdmin';

const contactSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  businessType: z.enum(['salon', 'restaurant', 'clinic', 'bakery', 'other', '']).optional(),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
  subject: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Get UTM parameters from headers or body
    const utmSource = request.headers.get('x-utm-source') || body.utmSource || null;
    const utmMedium = request.headers.get('x-utm-medium') || body.utmMedium || null;
    const utmCampaign = request.headers.get('x-utm-campaign') || body.utmCampaign || null;

    // Store contact submission in Firestore
    const contactRef = await db.collection('leads').add({
      type: 'contact',
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
      businessType: data.businessType || null,
      message: data.message,
      subject: data.subject || null,
      source: {
        utmSource,
        utmMedium,
        utmCampaign,
        referrer: request.headers.get('referer') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
      status: 'new',
      createdAt: new Date(),
    });

    // TODO: Send email notification to sales team
    // await sendEmail({
    //   to: 'suporte@puncto.com.br',
    //   subject: `Novo contato: ${data.name}`,
    //   body: `...`
    // });

    // TODO: Add to CRM (HubSpot, Pipedrive, etc.)
    // await crmIntegration.createLead(data);

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      id: contactRef.id,
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
