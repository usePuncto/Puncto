import Stripe from 'stripe';

export type StripeCheckoutSessionMetadata = {
  businessId: string;
  bookingId?: string;
  serviceId?: string;
  professionalId?: string;
  paymentType: 'deposit' | 'full' | 'package' | 'subscription';
  amount: string;
  currency: string;
};

export interface CreateCheckoutSessionParams {
  businessId: string;
  amount: number; // Amount in cents
  currency: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  metadata?: StripeCheckoutSessionMetadata;
  successUrl: string;
  cancelUrl: string;
  paymentMethodTypes?: ('card' | 'pix' | 'boleto')[];
}

export interface CreatePaymentLinkParams {
  businessId: string;
  name: string;
  amount: number; // Amount in cents
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  expiresAt?: Date;
  /** payment = cartão/Pix; boleto = somente boleto */
  linkKind?: 'payment' | 'boleto';
}

export interface CreateTransferParams {
  amount: number; // Amount in cents
  currency: string;
  destination: string; // Stripe Connect account ID
  transferGroup?: string;
  metadata?: Record<string, string>;
}
