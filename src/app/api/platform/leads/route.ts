import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { verifyPlatformAdmin } from '@/lib/auth/verifyPlatformAdmin';

function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * GET /api/platform/leads
 * List marketing solicitations (contact, demo, newsletter, webinar, etc.)
 */
export async function GET(request: NextRequest) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const snapshot = await db.collection('leads').orderBy('createdAt', 'desc').limit(500).get();

    let leads = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type || 'contact',
        status: data.status || 'new',
        priority: data.priority || 'normal',
        name: data.name || null,
        email: data.email || '',
        phone: data.phone || null,
        company: data.company || null,
        businessType: data.businessType || null,
        plan: data.plan || null,
        modules: Array.isArray(data.modules) ? data.modules : [],
        industry: data.industry || null,
        billing: data.billing || null,
        subject: data.subject || null,
        message: data.message || null,
        preferredDate: data.preferredDate || null,
        preferredTime: data.preferredTime || null,
        source: data.source || {},
        notes: data.notes || null,
        assignedTo: data.assignedTo || null,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      };
    });

    const counts = {
      all: leads.length,
      new: leads.filter((l) => l.status === 'new').length,
      contact: leads.filter((l) => l.type === 'contact').length,
      demo_request: leads.filter((l) => l.type === 'demo_request').length,
      newsletter: leads.filter((l) => l.type === 'newsletter').length,
      webinar: leads.filter((l) => l.type === 'webinar').length,
      module_interest: leads.filter((l) => l.type === 'module_interest').length,
      enterprise: leads.filter((l) => l.type === 'enterprise').length,
    };

    if (type && type !== 'all') {
      leads = leads.filter((l) => l.type === type);
    }
    if (status && status !== 'all') {
      leads = leads.filter((l) => l.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.email?.toLowerCase().includes(q) ||
          l.name?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.subject?.toLowerCase().includes(q) ||
          l.message?.toLowerCase().includes(q)
      );
    }

    const total = leads.length;
    const skip = (page - 1) * limit;
    const paged = leads.slice(skip, skip + limit);

    return NextResponse.json({
      leads: paged,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
      counts,
    });
  } catch (error: unknown) {
    console.error('[Platform API] Error fetching leads:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
