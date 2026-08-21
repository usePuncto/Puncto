/**
 * Fiscal notes manager — archive & consult notes issued outside Puncto.
 */

export type FiscalNoteType = 'nfse' | 'nfce' | 'nfe' | 'cfe' | 'other';

export type FiscalNoteStatus = 'stored' | 'pending' | 'cancelled' | 'archived';

export interface FiscalNote {
  id: string;
  businessId: string;
  type: FiscalNoteType;
  number: string;
  series?: string | null;
  /** Chave de acesso (44 dígitos) when applicable */
  accessKey?: string | null;
  issueDate: string; // ISO date YYYY-MM-DD or ISO datetime
  customerName?: string | null;
  customerDocument?: string | null;
  amount: number;
  status: FiscalNoteStatus;
  description?: string | null;
  externalUrl?: string | null;
  xmlStoragePath?: string | null;
  xmlDownloadUrl?: string | null;
  pdfStoragePath?: string | null;
  pdfDownloadUrl?: string | null;
  xmlFileName?: string | null;
  pdfFileName?: string | null;
  relatedOrderId?: string | null;
  relatedBookingId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy: string;
  retentionYears: number;
}

export const FISCAL_NOTE_TYPE_LABELS: Record<FiscalNoteType, string> = {
  nfse: 'NFS-e',
  nfce: 'NFC-e',
  nfe: 'NF-e',
  cfe: 'CF-e',
  other: 'Outra',
};

export const FISCAL_NOTE_STATUS_LABELS: Record<FiscalNoteStatus, string> = {
  stored: 'Arquivada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
  archived: 'Arquivo morto',
};
