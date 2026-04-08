import { Timestamp } from 'firebase/firestore';

/**
 * User Type defines the authentication domain
 * - platform_admin: SaaS team managing the platform
 * - business_user: Business owners, managers, staff
 * - customer: End users (booking, ordering, etc.)
 * - student: Education student portal users
 */
export type UserType = 'platform_admin' | 'business_user' | 'customer' | 'student';

export interface Dependent {
  id: string;
  name: string;
  relationship: string;
  birthDate?: string;
}

export interface UserPreferences {
  language: string;
  timezone: string;
}

/**
 * Firebase Custom Claims for authentication and authorization
 * These are set server-side and included in the JWT token
 */
export interface CustomClaims {
  // User type for authentication domain separation
  userType: UserType;

  // Platform admin access (only for platform_admin userType)
  platformAdmin?: boolean;
  platformRole?: 'super_admin' | 'support' | 'analyst';

  // Business user access (only for business_user userType)
  businessRoles?: {
    [businessId: string]: 'owner' | 'manager' | 'professional';
  };
  primaryBusinessId?: string; // The main business for this user
  professionalId?: string; // When role is professional, links to Professional document

  // Customer metadata (only for customer userType)
  customerId?: string;
  // Student metadata (only for student userType)
  studentCustomerId?: string;
  studentBusinessId?: string;
}

/**
 * Base User interface - stored in Firestore /users/{userId}
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  type: UserType; // Critical: determines authentication domain
  customClaims: CustomClaims;
  phone?: string;
  preferences: UserPreferences;
  dependents?: Dependent[];
  createdAt: Timestamp | Date;
  lastLoginAt: Timestamp | Date;
  consentVersion?: string;
  marketingConsent?: boolean;

  // Business user specific fields
  primaryBusinessId?: string; // Set only if type === 'business_user'

  // Customer specific fields
  loyaltyPoints?: number; // Set only if type === 'customer'
  // Student specific fields
  studentBusinessId?: string; // Set only if type === 'student'
  studentCustomerId?: string; // Customer document id in business scope
}

export interface PlatformAdmin {
  id: string;
  userId: string;
  role: 'super_admin' | 'support' | 'analyst';
  permissions: {
    accessAllBusinesses: boolean;
    manageSubscriptions: boolean;
    viewAuditLogs: boolean;
    manageSupportTickets: boolean;
    manageFeatureFlags: boolean;
  };
  active: boolean;
  createdAt: Timestamp | Date;
}

export interface AuditLog {
  id: string;
  timestamp: Timestamp | Date;
  userId: string;
  userEmail: string;
  businessId?: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  businessIdTimestamp?: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  userId: string;
  message: string;
  timestamp: Timestamp | Date;
  attachments?: string[];
}

export interface SupportTicket {
  id: string;
  businessId: string;
  createdBy: string;
  assignedTo?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  messages: TicketMessage[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  resolvedAt?: Timestamp | Date;
}
