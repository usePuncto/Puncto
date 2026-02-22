import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { MarketplaceFilters, MarketplaceSearchResult } from '@/types/marketplace';

export const dynamic = 'force-dynamic';

// GET - Search marketplace (professionals and establishments)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const serviceType = searchParams.get('serviceType');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minRating = searchParams.get('minRating');
    const featured = searchParams.get('featured') === 'true';
    const verified = searchParams.get('verified') === 'true';
    const sortBy = searchParams.get('sortBy') || 'rating';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const filters: MarketplaceFilters = {
      query: query || undefined,
      location: city || state ? { city: city || undefined, state: state || undefined } : undefined,
      serviceType: serviceType || undefined,
      priceRange: minPrice || maxPrice ? {
        min: minPrice ? parseInt(minPrice) : undefined,
        max: maxPrice ? parseInt(maxPrice) : undefined,
      } : undefined,
      rating: minRating ? parseFloat(minRating) : undefined,
      featured: featured || undefined,
      verified: verified || undefined,
      sortBy: sortBy as any,
    };

    // Get all businesses with marketplace enabled
    const businessesSnapshot = await db
      .collection('businesses')
      .where('marketplaceEnabled', '==', true)
      .get();

    const establishments: any[] = [];
    const professionals: any[] = [];

    for (const businessDoc of businessesSnapshot.docs) {
      const business = { id: businessDoc.id, ...businessDoc.data() } as Record<string, any> & { id: string };

      // Apply filters
      if (query && !business.displayName?.toLowerCase().includes(query.toLowerCase()) &&
          !business.about?.toLowerCase().includes(query.toLowerCase())) {
        continue;
      }

      if (city && business.address?.city !== city) continue;
      if (state && business.address?.state !== state) continue;
      if (featured && !business.marketplaceProfile?.featured) continue;
      if (verified && !business.marketplaceProfile?.verified) continue;

      // Get services
      const servicesSnapshot = await db
        .collection('businesses')
        .doc(business.id)
        .collection('services')
        .where('active', '==', true)
        .get();

      const services = servicesSnapshot.docs.map((doc) => ({
        serviceId: doc.id,
        serviceName: doc.data().name,
        price: doc.data().price,
        category: doc.data().category,
        durationMinutes: doc.data().durationMinutes,
      }));

      // Apply price filter
      if (filters.priceRange) {
        const hasMatchingPrice = services.some((s) => {
          const price = s.price;
          if (filters.priceRange?.min && price < filters.priceRange.min) return false;
          if (filters.priceRange?.max && price > filters.priceRange.max) return false;
          return true;
        });
        if (!hasMatchingPrice) continue;
      }

      // Get professionals
      const professionalsSnapshot = await db
        .collection('businesses')
        .doc(business.id)
        .collection('professionals')
        .where('active', '==', true)
        .where('canBookOnline', '==', true)
        .get();

      const businessProfessionals = professionalsSnapshot.docs.map((doc) => ({
        professionalId: doc.id,
        professionalName: doc.data().name,
        specialties: doc.data().specialties || [],
        rating: doc.data().rating,
      }));

      // Add establishment
      establishments.push({
        businessId: business.id,
        businessName: business.displayName,
        businessSlug: business.slug,
        displayName: business.displayName,
        industry: business.industry,
        address: {
          city: business.address?.city,
          state: business.address?.state,
          coordinates: business.address?.coordinates,
        },
        branding: {
          logoUrl: business.branding?.logoUrl,
          coverUrl: business.branding?.coverUrl,
        },
        rating: business.rating,
        reviewsCount: business.reviewsCount,
        about: business.about,
        services: services.slice(0, 10), // Limit services shown
        professionals: businessProfessionals.slice(0, 5), // Limit professionals shown
        marketplaceEnabled: true,
        marketplaceProfile: business.marketplaceProfile,
      });

      // Add individual professionals
      for (const profDoc of professionalsSnapshot.docs) {
        const prof = profDoc.data();
        
        // Check rating filter for professionals
        if (filters.rating && (!prof.rating || prof.rating < filters.rating)) {
          continue;
        }

        professionals.push({
          professionalId: profDoc.id,
          businessId: business.id,
          businessName: business.displayName,
          businessSlug: business.slug,
          professionalName: prof.name,
          avatarUrl: prof.avatarUrl,
          bio: prof.bio,
          specialties: prof.specialties || [],
          rating: prof.rating,
          totalReviews: prof.totalReviews,
          location: {
            city: business.address?.city,
            state: business.address?.state,
            coordinates: business.address?.coordinates,
          },
          services: services.filter((s) => 
            s.serviceId && (prof.serviceIds?.includes(s.serviceId) || !prof.serviceIds || prof.serviceIds.length === 0)
          ).slice(0, 5),
          marketplaceEnabled: true,
        });
      }
    }

    // Apply sorting
    if (sortBy === 'rating') {
      establishments.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      professionals.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price') {
      establishments.sort((a, b) => {
        const minA = Math.min(...a.services.map((s: any) => s.price));
        const minB = Math.min(...b.services.map((s: any) => s.price));
        return minA - minB;
      });
    } else if (sortBy === 'name') {
      establishments.sort((a, b) => a.businessName.localeCompare(b.businessName));
      professionals.sort((a, b) => a.professionalName.localeCompare(b.professionalName));
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEstablishments = establishments.slice(startIndex, endIndex);
    const paginatedProfessionals = professionals.slice(startIndex, endIndex);

    const result: MarketplaceSearchResult = {
      establishments: paginatedEstablishments,
      professionals: paginatedProfessionals,
      total: establishments.length + professionals.length,
      page,
      limit,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[marketplace GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search marketplace' },
      { status: 500 }
    );
  }
}
