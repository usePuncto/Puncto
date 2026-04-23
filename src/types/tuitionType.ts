import type { Timestamp } from 'firebase/firestore';

/** Plano/tipo de mensalidade definido pela escola (ex.: Integral, Meio período). */
export interface TuitionType {
  id: string;
  businessId: string;
  name: string;
  /** Valor sugerido em centavos (opcional); usado para pré-preencher novas mensalidades. */
  suggestedAmountCents?: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
