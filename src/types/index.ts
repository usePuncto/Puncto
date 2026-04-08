// Business types
export type {
  Address,
  Branding,
  Subscription,
  FeatureFlags,
  WorkingHours,
  WhatsAppConfig,
  CancellationPolicy,
  Settings,
  CustomField,
  CustomFields,
  Business,
  Location,
  Professional,
  Service,
  Staff,
} from './business';

// Booking types
export type {
  CustomerData,
  Reminders,
  BookingStatus,
  Booking,
  Customer,
} from './booking';

// User types
export type {
  UserType,
  Dependent,
  UserPreferences,
  CustomClaims,
  User,
  PlatformAdmin,
  AuditLog,
  TicketStatus,
  TicketPriority,
  TicketMessage,
  SupportTicket,
} from './user';

// Feature types
export type { SubscriptionTier } from './features';
export { TIER_FEATURES } from './features';

// Restaurant types
export type {
  Product,
  MenuCategory,
  Table,
  Order,
  OrderItem,
  OrderStatus,
  OrderItemStatus,
  PaymentMethod,
  SplitPayment,
} from './restaurant';

// Inventory types
export type {
  InventoryItem,
  InventoryMovement,
  InventoryMovementType,
} from './inventory';

// Purchases types
export type {
  Supplier,
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderItem,
} from './purchases';

// Time Clock types
export type {
  ClockIn,
  ClockInType,
  Shift,
  ShiftStatus,
  ShiftSchedule,
} from './timeClock';

// CRM types
export type {
  CustomerSegment,
  LoyaltyProgram,
  LoyaltyProgramType,
  LoyaltyTier,
  Campaign,
  CampaignType,
  CampaignStatus,
} from './crm';

// Marketplace types
export type {
  MarketplaceProfessional,
  MarketplaceEstablishment,
  MarketplaceFilters,
  MarketplaceSearchResult,
} from './marketplace';

// Education billing
export type {
  StudentSubscription,
  StudentSubscriptionStatus,
} from './studentSubscription';
