import { Timestamp } from 'firebase/firestore';

export type LeadType =
  | 'contact'
  | 'demo_request'
  | 'newsletter'
  | 'webinar'
  | 'module_interest'
  | 'enterprise';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'won'
  | 'lost'
  | 'archived';

export interface LeadSource {
  page?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
}

export interface Lead {
  id: string;
  type: LeadType;
  status: LeadStatus;
  priority?: 'normal' | 'high';
  name?: string | null;
  email: string;
  phone?: string | null;
  company?: string | null;
  businessType?: string | null;
  plan?: string | null;
  modules?: string[];
  industry?: string | null;
  billing?: 'monthly' | 'annual' | null;
  subject?: string | null;
  message?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  source?: LeadSource;
  assignedTo?: string | null;
  notes?: string | null;
  createdAt?: string | Timestamp | Date | null;
  updatedAt?: string | Timestamp | Date | null;
}
