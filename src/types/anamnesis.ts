import { Timestamp } from 'firebase/firestore';

export type AnamnesisFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox';

export interface AnamnesisFormField {
  id: string;
  label: string;
  type: AnamnesisFieldType;
  required: boolean;
  options?: string[]; // for select / multiselect
  placeholder?: string;
}

export interface AnamnesisForm {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  fields: AnamnesisFormField[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface AnamnesisResponse {
  id: string;
  businessId: string;
  patientId: string; // customerId
  formId: string;
  formName: string;
  answers: Record<string, string | number | boolean | string[]>;
  filledBy?: string; // userId
  filledByName?: string;
  filledAt: Timestamp | Date;
  createdAt: Timestamp | Date;
}
