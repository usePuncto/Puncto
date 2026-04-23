import { Timestamp } from 'firebase/firestore';

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded' | 'partially_refunded';

export type PaymentMethod = 'card' | 'pix' | 'bank_transfer' | 'other';

export type RefundStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';

export interface Payment {
  id: string;
  businessId: string;
  bookingId?: string; // Link to booking if payment is for booking
  paymentLinkId?: string; // Link to payment link if created via Virtual POS
  /** Stripe Payment Link id (e.g. pl_...) when checkout came from a Payment Link */
  stripePaymentLinkStripeId?: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  amount: number; // Amount in cents
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  stripeSubscriptionId?: string;
  stripeChargeId?: string;
  stripeCheckoutSessionId?: string;
  metadata?: Record<string, string>;
  description?: string;
  /** Mensalidade escolar (webhook Connect) */
  tuitionTypeId?: string;
  tuitionTypeName?: string;
  refundedAmount?: number; // Amount refunded in cents
  refunds?: Refund[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  succeededAt?: Timestamp | Date;
  failedAt?: Timestamp | Date;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number; // Amount refunded in cents
  currency: string;
  reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent' | 'other';
  status: RefundStatus;
  stripeRefundId: string;
  createdAt: Timestamp | Date;
  processedAt?: Timestamp | Date;
  createdBy?: string; // User ID who initiated refund
  notes?: string;
}

export interface PaymentLink {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  amount: number; // Amount in cents
  currency: string;
  stripePaymentLinkId: string;
  stripePaymentLinkUrl: string;
  qrCodeUrl?: string;
  active: boolean;
  metadata?: Record<string, string>;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  expiresAt?: Timestamp | Date;
  /** First successful payment (webhook) */
  paidAt?: Timestamp | Date;
  /** Firestore payment doc id from last checkout */
  lastPaymentId?: string;
  paymentCount?: number;
  /** Manual cancel timestamp */
  cancelledAt?: Timestamp | Date;
  /** Linked business customer (aluno) */
  linkedCustomerId?: string;
}

export interface Commission {
  id: string;
  paymentId: string;
  bookingId: string;
  businessId: string;
  professionalId: string;
  professionalName: string;
  amount: number; // Commission amount in cents
  percentage: number; // Commission percentage
  stripeTransferId?: string;
  stripeConnectAccountId?: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  paidAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface BankTransaction {
  id: string;
  businessId: string;
  bankName: string;
  accountNumber: string;
  transactionDate: Timestamp | Date;
  description: string;
  amount: number; // Positive for credit, negative for debit
  currency: string;
  balance?: number;
  reference?: string;
  matchedPaymentId?: string; // Link to payment if matched
  matchedLedgerEntryId?: string; // Link to ledger entry if matched
  reconciled: boolean;
  reconciledAt?: Timestamp | Date;
  importedAt: Timestamp | Date;
  importedFrom?: 'ofx' | 'csv' | 'manual';
}
