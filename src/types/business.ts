import { Timestamp } from 'firebase/firestore';

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Branding {
  logoUrl?: string;
  coverUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  gallery: string[];
  // Phase 4: White-label customization
  customCSS?: string;
  faviconUrl?: string;
  hidePunctoBranding?: boolean;
}

export interface Subscription {
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'trial' | 'suspended' | 'cancelled' | 'pending_payment';
  currentPeriodStart: Timestamp | Date;
  currentPeriodEnd: Timestamp | Date;
  trialEndsAt?: Timestamp | Date;
  billingEmail: string;
  paymentMethod?: {
    type: string;
    last4?: string;
  };
  // Stripe subscription fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  cancelAtPeriodEnd?: boolean;
  // Stripe checkout session ID for pending payments
  stripeCheckoutSessionId?: string;
}

export interface FeatureFlags {
  maxLocations: number;
  maxProfessionals: number;
  maxServicesPerMonth: number;
  whatsappReminders: boolean;
  emailReminders: boolean;
  smsReminders?: boolean;
  customBranding: boolean;
  advancedReports: boolean;
  apiAccess: boolean;
  multiLocation: boolean;
  dependentBooking: boolean;
  customFields: boolean;
  prioritySupport: boolean;
  webhooks?: boolean;
  whiteLabel?: boolean;
  bookingRetentionDays: number;
  customerRetentionDays: number;
  exportFormats: string[];
  // Phase 3: Restaurant Module
  restaurantMenu?: boolean;
  tableOrdering?: boolean;
  virtualTabs?: boolean;
  splitPayments?: boolean;
  thermalPrinting?: boolean;
  nfceGeneration?: boolean;
  // Phase 3: ERP Module
  inventoryManagement?: boolean;
  purchaseOrders?: boolean;
  costCalculation?: boolean;
  budgets?: boolean;
  // Phase 3: Time Clock
  timeClock?: boolean;
  attendanceReports?: boolean;
  payrollExport?: boolean;
  // Phase 3: CRM
  customerSegmentation?: boolean;
  loyaltyPrograms?: boolean;
  campaigns?: boolean;
  birthdayReminders?: boolean;
  /** Clinic: Electronic medical records (prontuário eletrônico) with Gov.br signature */
  healthRecords?: boolean;
}

export interface WorkingHours {
  [day: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export interface WhatsAppMessageTemplate {
  id: string;
  name: string;
  body: string;
}

export interface WhatsAppConfig {
  number: string; // Business WhatsApp number
  presetMessage?: string; // Legacy: single default message (kept for backward compat)
  /** Multiple message templates for manual WhatsApp mode */
  messageTemplates?: WhatsAppMessageTemplate[];
  apiProvider?: 'twilio' | 'maytapi' | 'wati' | 'evolution';
  apiKey?: string;
  instanceName?: string;
  apiUrl?: string;
}

export interface CancellationPolicy {
  enabled: boolean;
  hoursBeforeService: number;
  penalty?: number;
  refundPercent?: number; // Percentage to refund (0-100)
  fullRefundHours?: number; // Hours before service for full refund
  noRefundHours?: number; // Hours before service for no refund
  /** Custom text shown when client clicks "política de cancelamento" link */
  text?: string;
}

export type ConfirmationChannel = 'email' | 'whatsapp';

export interface Settings {
  timezone: string;
  locale: 'pt-BR' | 'en-US' | 'es-ES';
  currency: string;
  bookingWindow: number;
  cancellationPolicy: CancellationPolicy;
  workingHours: WorkingHours;
  whatsapp?: WhatsAppConfig;
  /** Channels for sending booking confirmations (email, whatsapp) */
  confirmationChannels?: ConfirmationChannel[];
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date';
  required: boolean;
  options?: string[];
}

export interface CustomFields {
  customer?: CustomField[];
  booking?: CustomField[];
}

export interface Business {
  id: string;
  slug: string;
  displayName: string;
  legalName: string;
  taxId: string;
  branding: Branding;
  email: string;
  phone: string;
  address: Address;
  about: string;
  industry: string;
  website?: string;
  subscription: Subscription;
  features: FeatureFlags;
  settings: Settings;
  customFields?: CustomFields;
  rating?: number;
  reviewsCount?: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
  deletedAt?: Timestamp | Date;
  dataRetentionDays: number;
  consentVersion: string;
  // Phase 4: Franchise management
  isFranchiseGroup?: boolean;
  franchiseGroupId?: string;
  franchiseUnits?: string[]; // Array of business IDs that belong to this franchise group
  marketplaceEnabled?: boolean; // If true, business appears in marketplace
  marketplaceProfile?: {
    description?: string;
    tags?: string[];
    featured?: boolean;
    verified?: boolean;
  };
  /** Stripe Connect Express account for this business (receiving payments) */
  stripeConnectAccountId?: string;
  stripeConnectDetailsSubmitted?: boolean;
  stripeConnectChargesEnabled?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  stripeConnectOnboardingComplete?: boolean;
}

export interface Location {
  id: string;
  businessId: string;
  name: string;
  address: Address;
  phone?: string;
  email?: string;
  workingHours?: WorkingHours;
  isDefault: boolean;
  active: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Professional {
  id: string;
  businessId: string;
  userId?: string;
  /** True when this professional is the business owner; cannot be deleted, only edited */
  isOwner?: boolean;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  specialties: string[];
  rating?: number;
  totalReviews?: number;
  locationIds: string[];
  workingHours?: WorkingHours;
  active: boolean;
  canBookOnline: boolean;
  bufferTimeBefore?: number;
  bufferTimeAfter?: number;
  commissionPercent?: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/** Product from inventory linked to a service, with quantity needed per service */
export interface ServiceInventoryItem {
  inventoryItemId: string;
  inventoryItemName?: string;
  quantity: number;
  unit?: string;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  currency: string;
  durationMinutes: number;
  professionalIds: string[];
  locationIds?: string[];
  active: boolean;
  /** Optional: products from inventory needed for this service */
  inventoryItems?: ServiceInventoryItem[];
  requiresDeposit?: boolean;
  depositAmount?: number;
  maxAdvanceBookingDays?: number;
  displayOrder?: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Staff {
  id: string;
  businessId: string;
  userId: string;
  role: 'owner' | 'manager' | 'professional';
  permissions?: {
    manageServices: boolean;
    manageProfessionals: boolean;
    manageBookings: boolean;
    viewReports: boolean;
    manageSettings: boolean;
    manageLocations: boolean;
    exportData: boolean;
  };
  professionalId?: string;
  active: boolean;
  invitedAt?: Timestamp | Date;
  inviteAcceptedAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
