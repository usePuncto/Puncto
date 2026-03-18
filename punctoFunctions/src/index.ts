/**
 * Puncto Cloud Functions
 *
 * Multi-tenant scheduling platform with authentication and role-based access control.
 */

import { setGlobalOptions } from "firebase-functions/v2";

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "southamerica-east1", // São Paulo region for better latency in Brazil
});

// ===== Authentication Functions =====
// Note: User document creation is handled client-side in AuthContext
// export { onUserCreate } from "./auth/onUserCreate";  // Disabled - will implement with v1 API later
export { setCustomClaims } from "./auth/setCustomClaims";

// ===== Staff Management Functions =====
export { inviteStaff } from "./staff/inviteStaff";
export { acceptInvite } from "./staff/acceptInvite";

// ===== Scheduled Functions =====
export { sendBookingReminders } from "./scheduled/reminders";

// ===== Firestore Triggers =====
export { onBookingCreate } from "./triggers/onBookingCreate";
export { onBookingCancel } from "./triggers/onBookingCancel";
export { onBookingStatusChange } from "./triggers/onBookingStatusChange";

// ===== Payment Functions =====
export { processCommission } from "./payments/processCommission";

// ===== Scheduled Reports =====
export { generateDailyFinancialSummary } from "./reports/dailySummary";

// ===== Phase 3: Restaurant & ERP Functions =====
export { onOrderCreate } from "./triggers/onOrderCreate";
export { onOrderPaid } from "./triggers/onOrderPaid";
export { checkInventoryAlerts } from "./scheduled/inventoryAlerts";
export { sendBirthdayReminders } from "./scheduled/birthdayReminders";
export { onClockIn } from "./triggers/onClockIn";

// ===== Phase 4: Webhook Functions =====
export { onWebhookDeliveryCreated } from "./webhooks/deliver";