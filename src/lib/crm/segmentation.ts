import { Customer } from '@/types/booking';
import { CustomerSegment } from '@/types/crm';

/**
 * Check if a customer matches segment criteria
 */
export function matchesSegment(customer: Customer, segment: CustomerSegment): boolean {
  const { criteria } = segment;

  if (criteria.minBookings && customer.totalBookings < criteria.minBookings) {
    return false;
  }

  if (criteria.minSpend && customer.totalSpent < criteria.minSpend) {
    return false;
  }

  if (criteria.lastVisitDays && customer.lastBookingAt) {
    const lastBookingDate = 'toDate' in customer.lastBookingAt 
      ? customer.lastBookingAt.toDate() 
      : new Date(customer.lastBookingAt);
    const daysSinceLastVisit =
      (Date.now() - lastBookingDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastVisit > criteria.lastVisitDays) {
      return false;
    }
  }

  if (criteria.tags && criteria.tags.length > 0) {
    const customerTags = customer.customFields?.tags || [];
    const hasAllTags = criteria.tags.every((tag) => customerTags.includes(tag));
    if (!hasAllTags) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate customer lifetime value
 */
export function calculateLifetimeValue(customer: Customer): number {
  return customer.totalSpent;
}

/**
 * Auto-segment customers
 */
export function autoSegmentCustomers(
  customers: Customer[],
  segments: CustomerSegment[]
): Map<string, string[]> {
  const segmentMap = new Map<string, string[]>();

  segments.forEach((segment) => {
    const matchingCustomers = customers
      .filter((customer) => matchesSegment(customer, segment))
      .map((customer) => customer.id);

    segmentMap.set(segment.id, matchingCustomers);
  });

  return segmentMap;
}
