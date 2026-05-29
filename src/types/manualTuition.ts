import type { Timestamp } from 'firebase/firestore';

export type ManualTuitionEnrollmentStatus = 'active' | 'completed' | 'canceled';

export type ManualTuitionInstallmentStatus = 'pending' | 'paid' | 'overdue';

/** Plano de mensalidade manual de um aluno (sem Stripe). */
export interface ManualTuitionEnrollment {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  /** Ex.: "Pacote trimestral — 2x/semana" */
  planName: string;
  /** Pacote: cobrança a cada N meses (1 = mensal, 2 = bimestral, 3 = trimestral). */
  billingCycleMonths: number;
  frequencyPerWeek: number;
  /** Valor do pacote por ciclo de cobrança, em centavos */
  packageAmountCents: number;
  /** Data de início do plano (YYYY-MM-DD) */
  startDate: string;
  /** Dia do mês para vencimento (1–28) */
  dueDayOfMonth: number;
  status: ManualTuitionEnrollmentStatus;
  notes?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/** Cobrança individual de um plano (uma fatura por ciclo do pacote). */
export interface ManualTuitionInstallment {
  id: string;
  businessId: string;
  enrollmentId: string;
  customerId: string;
  customerName: string;
  planName: string;
  installmentNumber: number;
  dueDate: Timestamp | Date;
  amountCents: number;
  status: ManualTuitionInstallmentStatus;
  paidAt?: Timestamp | Date | null;
  notes?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
