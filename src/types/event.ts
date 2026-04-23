import type { Timestamp } from 'firebase/firestore';

export type EventStatus = 'active' | 'inactive' | 'soon';

export interface EventItem {
  id: string;
  businessId: string;
  name: string;
  date: string; // yyyy-MM-dd
  location: string;
  status: EventStatus;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  name: string;
  phone: string;
  email: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
