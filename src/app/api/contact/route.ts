import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/firebaseAdmin';
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/api/ipRateLimit';

const contactSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  businessType: z.string().optional(),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
  subject: z.string().optional(),
  plan: z.string().optional(),
  modules: z.union([z.array(z.string()), z.string()]).optional(),
  industry: z.string().optional(),
  billing: z.enum(['monthly', 'annual']).optional(),
  page: z.string().optional(),
  leadType: z
    .enum(['contact', 'demo_request', 'newsletter', 'webinar', 'module_interest', 'enterprise'])
    .optional(),
});

function normalizeModules(modules: string[] | string | undefined): string[] {
  if (!modules) return [];
  if (Array.isArray(modules)) return modules.filter(Boolean);
  return modules.split(',').map((m) => m.trim()).filter(Boolean);
}

function resolveLeadType(data: z.infer<typeof contactSchema>): string {
  if (data.leadType) return data.leadType;
  if (data.plan === 'enterprise') return 'enterprise';
  if (data.plan && normalizeModules(data.modules).length > 0) return 'module_interest';
  if (data.subject?.toLowerCase().includes('webinar')) return 'webinar';
  return 'contact';
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limit = checkIpRateLimit(`contact:${ip}`, {
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

    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;
    const modules = normalizeModules(data.modules);
    const leadType = resolveLeadType(data);

    const utmSource = request.headers.get('x-utm-source') || body.utmSource || null;
    const utmMedium = request.headers.get('x-utm-medium') || body.utmMedium || null;
    const utmCampaign = request.headers.get('x-utm-campaign') || body.utmCampaign || null;

    const contactRef = await db.collection('leads').add({
      type: leadType,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      company: data.company || null,
      businessType: data.businessType || null,
      message: data.message,
      subject: data.subject || null,
      plan: data.plan || null,
      modules,
      industry: data.industry || null,
      billing: data.billing || null,
      source: {
        page: data.page || '/contact',
        utmSource,
        utmMedium,
        utmCampaign,
        referrer: request.headers.get('referer') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
      status: 'new',
      priority: leadType === 'enterprise' || leadType === 'module_interest' ? 'high' : 'normal',
      notes: null,
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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
