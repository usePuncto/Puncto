import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Branding } from '@/types/business';

// GET - Get branding for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const branding = businessDoc.data()?.branding || {};
    return NextResponse.json(branding);
  } catch (error) {
    console.error('[branding GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branding' },
      { status: 500 }
    );
  }
}

// PATCH - Update branding
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const brandingUpdate: Partial<Branding> = body.branding;

    if (!brandingUpdate) {
      return NextResponse.json(
        { error: 'branding data is required' },
        { status: 400 }
      );
    }

    // Reject base64 data URLs - images must be uploaded via /api/branding/upload first
    const urlFields = ['logoUrl', 'coverUrl', 'faviconUrl'] as const;
    for (const field of urlFields) {
      const val = brandingUpdate[field];
      if (typeof val === 'string' && val.startsWith('data:')) {
        return NextResponse.json(
          {
            error:
              `${field} cannot be a base64 data URL. Please upload images using the file picker; they will be stored in cloud storage.`,
          },
          { status: 400 }
        );
      }
    }

    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if business has white-label feature
    const features = businessDoc.data()?.features || {};
    if (brandingUpdate.customCSS || brandingUpdate.hidePunctoBranding) {
      if (!features.whiteLabel) {
        return NextResponse.json(
          { error: 'White-label feature not available for this subscription tier' },
          { status: 403 }
        );
      }
    }

    // Merge with existing branding
    const currentBranding = businessDoc.data()?.branding || {};
    const updatedBranding: Branding = {
      ...currentBranding,
      ...brandingUpdate,
      gallery: brandingUpdate.gallery || currentBranding.gallery || [],
    };

    await businessRef.update({
      branding: updatedBranding,
      updatedAt: new Date(),
    });

    const updatedDoc = await businessRef.get();
    return NextResponse.json({
      id: updatedDoc.id,
      branding: updatedDoc.data()?.branding,
    });
  } catch (error) {
    console.error('[branding PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update branding' },
      { status: 500 }
    );
  }
}
