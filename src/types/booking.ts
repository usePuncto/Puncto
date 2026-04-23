import { Timestamp } from 'firebase/firestore';

export interface CustomerData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

/** Endereço residencial do cliente/paciente/aluno (admin). */
export interface CustomerAddress {
  street?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  /** UF (ex.: SP) */
  state?: string;
}

export interface Reminders {
  whatsappSent?: Timestamp | Date;
  emailSent?: Timestamp | Date;
  smsSent?: Timestamp | Date;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface BookingUsedInventoryItem {
  inventoryItemId: string;
  inventoryItemName?: string;
  quantity: number;
  unit?: string;
}

export interface Booking {
  id: string;
  businessId: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  locationId: string;
  locationName?: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledDateTime: Timestamp | Date;
  durationMinutes: number;
  endDateTime: Timestamp | Date;
  customerId?: string;
  customerData: CustomerData;
  status: BookingStatus;
  price: number;
  currency: string;
  // Payment fields
  paymentId?: string;
  paymentStatus?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  amountPaid?: number;
  depositAmount?: number;
  requiresPayment?: boolean;
  // End payment fields
  notes?: string;
  reminders: Reminders;
  cancelledAt?: Timestamp | Date;
  cancelledBy?: string;
  cancellationReason?: string;
  /** Actual inventory consumption recorded when completing the booking */
  usedInventoryItems?: BookingUsedInventoryItem[];
  inventoryDeductedAt?: Timestamp | Date;
  customFields?: Record<string, any>;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  /** yyyy-MM-dd */
  birthDate?: string;
  totalBookings: number;
  totalSpent: number;
  lastBookingAt?: Timestamp | Date;
  preferredProfessionalIds?: string[];
  notes?: string;
  consentGiven: boolean;
  consentDate?: Timestamp | Date;
  dataExportRequested?: Timestamp | Date;
  deletionRequested?: Timestamp | Date;
  customFields?: Record<string, any>;
  // Phase 3: CRM fields
  tags?: string[];
  segmentIds?: string[];
  lifetimeValue?: number;
  lastVisitAt?: Timestamp | Date;
  // Phase 3: Loyalty fields
  loyaltyPoints?: number;
  loyaltyTier?: string;
  totalPointsEarned?: number;
  totalPointsRedeemed?: number;
  // Education/student portal fields
  studentUserId?: string;
  studentAccessEnabled?: boolean;
  stripeCustomerId?: string;
  /** Tipo de mensalidade padrão (tuitionTypes/{id}) — educação */
  tuitionTypeId?: string;
  address?: CustomerAddress;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
