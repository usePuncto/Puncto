import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Campaign, CampaignType } from '@/types/crm';
import { Customer } from '@/types/booking';
import { sendWhatsApp, formatPhoneNumber } from '@/lib/messaging/whatsapp';
import { sendEmail } from '@/lib/messaging/email';

// POST - Send campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, campaignId } = body;

    if (!businessId || !campaignId) {
      return NextResponse.json(
        { error: 'businessId and campaignId are required' },
        { status: 400 }
      );
    }

    // Get campaign
    const campaignRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('campaigns')
      .doc(campaignId);

    const campaignDoc = await campaignRef.get();
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaign = {
      id: campaignDoc.id,
      ...campaignDoc.data(),
    } as Campaign;

    // Get target customers
    let customerIds: string[] = [];

    if (campaign.customerIds && campaign.customerIds.length > 0) {
      customerIds = campaign.customerIds;
    } else if (campaign.segmentIds && campaign.segmentIds.length > 0) {
      // Get customers from segments
      const segmentsSnapshot = await db
        .collection('businesses')
        .doc(businessId)
        .collection('customerSegments')
        .where('id', 'in', campaign.segmentIds)
        .get();

      const allCustomerIds = new Set<string>();
      segmentsSnapshot.docs.forEach((doc) => {
        const segment = doc.data();
        (segment.customerIds || []).forEach((id: string) => allCustomerIds.add(id));
      });
      customerIds = Array.from(allCustomerIds);
    }

    // Get customer data
    const customersSnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('customers')
      .where('id', 'in', customerIds.slice(0, 500)) // Limit to 500 per batch
      .get();

    const customers = customersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Customer[];

    // Update campaign status
    await campaignRef.update({
      status: 'sending',
      updatedAt: new Date(),
    });

    // Send messages based on campaign type
    let sent = 0;
    let delivered = 0;

    for (const customer of customers) {
      try {
        const message = replaceTemplateVariables(campaign.template, customer);

        if (campaign.type === 'whatsapp' && customer.phone) {
          await sendWhatsApp({
            businessId,
            to: formatPhoneNumber(customer.phone),
            text: message,
          });
          delivered++;
        } else if (campaign.type === 'email' && customer.email) {
          await sendEmail({ to: customer.email, subject: campaign.name, html: message });
          delivered++;
        }

        sent++;
      } catch (error) {
        console.error(`Failed to send to customer ${customer.id}:`, error);
      }
    }

    // Update campaign stats
    await campaignRef.update({
      status: 'sent',
      sentAt: new Date(),
      stats: {
        sent,
        delivered,
      },
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      sent,
      delivered,
    });
  } catch (error) {
    console.error('[campaigns send POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}

/**
 * Replace template variables in message
 */
function replaceTemplateVariables(template: string, customer: Customer): string {
  return template
    .replace(/\{\{name\}\}/g, `${customer.firstName} ${customer.lastName}`)
    .replace(/\{\{firstName\}\}/g, customer.firstName)
    .replace(/\{\{lastName\}\}/g, customer.lastName)
    .replace(/\{\{totalSpent\}\}/g, (customer.totalSpent / 100).toFixed(2))
    .replace(/\{\{totalBookings\}\}/g, customer.totalBookings.toString());
}
