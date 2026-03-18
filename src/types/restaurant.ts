import { Timestamp } from 'firebase/firestore';

export interface ProductVariation {
  name: string; // "Size", "Toppings"
  options: Array<{ name: string; price: number }>;
}

export interface ProductIngredient {
  inventoryItemId: string;
  inventoryItemName?: string; // Denormalized for display
  quantity: number;
  unit?: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  category: string; // "appetizers", "mains", "desserts", "drinks"
  price: number;
  imageUrl?: string;
  allergens: string[]; // ["gluten", "dairy", "nuts"]
  available: boolean;
  variations?: ProductVariation[];
  ingredients?: ProductIngredient[]; // Linked to inventory
  cost?: number; // For CSP calculation
  preparationTime?: number; // minutes
  displayOrder?: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface MenuCategory {
  id: string;
  businessId: string;
  name: string;
  displayOrder: number;
  active: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Table {
  id: string;
  businessId: string;
  number: string; // "1", "2A", "VIP-1"
  capacity: number;
  location: "indoor" | "outdoor" | "bar";
  qrCodeUrl: string; // Generated QR code image URL
  qrCodeData: string; // URL: /tenant/table/{tableId}
  active: boolean;
  currentOrderId?: string; // Active order
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export type OrderStatus = "open" | "paid" | "canceled";
export type OrderItemStatus = "pending" | "preparing" | "ready" | "delivered";
export type PaymentMethod = "card" | "pix" | "cash" | "split";

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  status: OrderItemStatus;
  preparedAt?: Timestamp | Date;
  readyAt?: Timestamp | Date;
  deliveredAt?: Timestamp | Date;
  variation?: {
    name: string;
    option: string;
  };
}

export interface SplitPayment {
  userId: string;
  amount: number;
  paymentId?: string;
  status?: "pending" | "paid" | "failed";
}

export interface Order {
  id: string;
  businessId: string;
  tableId: string;
  tableNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  paymentId?: string;
  paymentMethod?: PaymentMethod;
  splitPayments?: SplitPayment[];
  customerId?: string;
  waiterId?: string; // Staff who served
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  closedAt?: Timestamp | Date;
}
