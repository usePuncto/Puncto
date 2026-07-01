import type { Timestamp } from 'firebase/firestore';

export type ManualTuitionEnrollmentStatus = 'active' | 'completed' | 'canceled';

export type ManualTuitionInstallmentStatus = 'pending' | 'paid' | 'overdue';

/** Plano de mensalidade manual de um aluno (sem Stripe). */
export interface ManualTuitionEnrollment {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  planName: string;
  /** Cobrança a cada N meses (1 = mensal, 3 = trimestral). */
  billingCycleMonths: number;
  frequencyPerWeek: number;
  /** Valor de cada mensalidade/cobrança, em centavos. */
  installmentAmountCents: number;
  /** Valor da 1ª cobrança quando diferente (ex.: proporcional ao início no meio do mês), em centavos. */
  firstInstallmentAmountCents?: number;
  /** Vencimento da 1ª cobrança quando diferente (YYYY-MM-DD). */
  firstInstallmentDueDate?: string;
  /** Duração total do plano em meses (ex.: 12). */
  planDurationMonths: number;
  /** Data de início do plano (YYYY-MM-DD). */
  startDate: string;
  /** Data de término do plano (YYYY-MM-DD), calculada a partir do início + duração. */
  planEndDate: string;
  /** Dia do mês para vencimento (1–28). */
  dueDayOfMonth: number;
  status: ManualTuitionEnrollmentStatus;
  notes?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/** Cobrança individual de um plano. */
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
