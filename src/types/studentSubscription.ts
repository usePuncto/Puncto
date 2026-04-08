import type { Timestamp } from 'firebase/firestore';

export type StudentSubscriptionStatus =
  | 'pending_checkout'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete';

export interface StudentSubscription {
  id: string;
  businessId: string;
  customerId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  amount: number;
  currency: string;
  interval: 'month';
  status: StudentSubscriptionStatus;
  currentPeriodStart?: Timestamp | Date;
  currentPeriodEnd?: Timestamp | Date;
  cancelAtPeriodEnd?: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
