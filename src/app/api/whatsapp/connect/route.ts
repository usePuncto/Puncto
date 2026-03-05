/**
 * Meta Embedded Signup: exchange authorization code for credentials.
 * All API calls are server-side. Never expose tokens to frontend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { saveWhatsAppCredentials } from '@/lib/whatsapp/credentials';

const GRAPH_VERSION = 'v21.0';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, code } = body;

    if (!businessId || !code) {
      return NextResponse.json(
        { error: 'businessId and code are required' },
        { status: 400 }
      );
    }

    const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('[whatsapp/connect] Missing META_APP_ID or META_APP_SECRET');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify business exists
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Step 1: Exchange code for access token
    const params: Record<string, string> = {
      client_id: appId,
      client_secret: appSecret,
      code,
    };
    const redirectUri = process.env.META_WHATSAPP_REDIRECT_URI;
    if (redirectUri) params.redirect_uri = redirectUri;
    const tokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
        new URLSearchParams(params).toString()
    );

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error('[whatsapp/connect] Token exchange error:', tokenData);
      return NextResponse.json(
        { error: tokenData.error?.message || 'Failed to exchange code' },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token in response' },
        { status: 400 }
      );
    }

    // Step 2: Get WABA ID and phone number ID
    const wabaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me?` +
        new URLSearchParams({
          fields:
            'owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}',
          access_token: accessToken,
        }).toString()
    );

    const wabaData = await wabaRes.json();

    if (!wabaRes.ok) {
      console.error('[whatsapp/connect] WABA fetch error:', wabaData);
      return NextResponse.json(
        { error: wabaData.error?.message || 'Failed to get WhatsApp account' },
        { status: 400 }
      );
    }

    const accounts = wabaData.owned_whatsapp_business_accounts?.data;
    if (!accounts?.length) {
      return NextResponse.json(
        { error: 'No WhatsApp Business Account found' },
        { status: 400 }
      );
    }

    const waba = accounts[0];
    const phoneNumbers = waba.phone_numbers?.data;
    if (!phoneNumbers?.length) {
      return NextResponse.json(
        { error: 'No phone number found in WhatsApp Business Account' },
        { status: 400 }
      );
    }

    const phone = phoneNumbers[0];

    await saveWhatsAppCredentials({
      businessId,
      phoneNumberId: phone.id,
      accessToken,
      wabaId: waba.id,
      phoneNumber: phone.display_phone_number || undefined,
    });

    // Update business settings with the display number
    await db.collection('businesses').doc(businessId).update({
      'settings.whatsapp': {
        ...businessDoc.data()?.settings?.whatsapp,
        number: phone.display_phone_number || '',
      },
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      phoneNumber: phone.display_phone_number,
    });
  } catch (error) {
    console.error('[whatsapp/connect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect WhatsApp' },
      { status: 500 }
    );
  }
}
