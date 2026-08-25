import { Timestamp, GeoPoint } from 'firebase/firestore';

export type ClockInType = 'in' | 'out' | 'break_start' | 'break_end';

export type TimestampSource = 'ntp_br_on' | 'server_fallback';

/**
 * Original punch mark (denormalized from ARP type-7). Immutable after write.
 * Adjustments belong in timeClockAdjustments → AEJ only.
 */
export interface ClockIn {
  id: string;
  businessId: string;
  userId: string;
  type: ClockInType;
  /** Official HLB time — never from device */
  timestamp: Timestamp | Date;
  timestampSource?: TimestampSource;
  ntpServer?: string | null;
  ntpOffsetMs?: number;
  nsr?: number;
  fiscalEventId?: string;
  previousHash?: string | null;
  afdHash?: string;
  integrityHash?: string;
  employeeCpf?: string | null;
  employeeName?: string;
  esocialRegistration?: string | null;
  collectorId?: string;
  offline?: boolean;
  immutable?: boolean;
  origin?: 'rep_p_original';
  retentionUntil?: Timestamp | Date;
  retentionYears?: number;
  location?: GeoPoint | { lat: number; lng: number } | null;
  /** Purpose of geolocation collection (personal data, not sensitive) */
  locationPurpose?: string | null;
  deviceId?: string;
  ipAddress?: string | null;
  clientReportedAt?: string | null;
  rhReviewed?: boolean;
  rhReviewedBy?: string | null;
  rhReviewedAt?: Timestamp | Date | null;
  rhNotes?: string;
  /** @deprecated legacy */
  validated?: boolean;
  validatedBy?: string;
  validatedAt?: Timestamp | Date;
  notes?: string | null;
  receiptStatus?: 'pending' | 'ready' | 'failed';
  receiptId?: string | null;
  receiptAvailableUntil?: Timestamp | Date | null;
  createdAt: Timestamp | Date;
  createdBy?: string;
}

/** Append-only fiscal ledger event (ARP) */
export interface RepFiscalEvent {
  id: string;
  businessId: string;
  nsr: number;
  recordType: '2' | '4' | '5' | '6' | '7';
  eventKind: string;
  recordedAt: Timestamp | Date;
  payload: Record<string, unknown>;
  afdHash?: string | null;
  previousHash?: string | null;
  immutable: true;
  appendOnly: true;
  createdAt: Timestamp | Date;
  createdBy: string;
}

export type ShiftStatus = 'active' | 'completed' | 'adjusted';

export interface Shift {
  id: string;
  businessId: string;
  userId: string;
  startTime: Timestamp | Date;
  endTime?: Timestamp | Date;
  breakDuration?: number;
  breakStartedAt?: Timestamp | Date | null;
  totalHours?: number;
  overtimeHours?: number;
  status: ShiftStatus;
  clockIns: string[];
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  managedByApi?: boolean;
  anomalous?: boolean;
  closedReason?: string;
}

/** Legacy UX schedules — prefer ContractualSchedule for fiscal AEJ */
export interface ShiftSchedule {
  id: string;
  businessId: string;
  userId: string;
  startDate: Timestamp | Date;
  endDate?: Timestamp | Date;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  breakDuration: number;
  locationId?: string;
  active: boolean;
  createdAt: Timestamp | Date;
}

/**
 * Horário contratual (fiscal) — never auto-fills punches.
 * Exported as AEJ tipo 04.
 */
export interface ContractualSchedule {
  id: string;
  businessId: string;
  userId?: string | null;
  code: string;
  label?: string;
  pairs: Array<{ entrada: string; saida: string }>;
  durJornadaMinutes: number;
  validFrom: Timestamp | Date;
  validTo?: Timestamp | Date | null;
  active: boolean;
  doesNotAutoFillMarks: true;
  createdAt: Timestamp | Date;
  createdBy: string;
}

/** Parallel treatment row — never overwrites ClockIn / ARP */
export interface TimeClockAdjustment {
  id: string;
  businessId: string;
  userId: string;
  employeeCpf?: string | null;
  employeeName?: string;
  kind: 'absence' | 'medical' | 'time_bank' | 'manual_insert' | 'disregard' | 'dsr' | 'holiday_comp' | 'other';
  date: Timestamp | Date;
  markAt?: Timestamp | Date | null;
  markType?: string | null;
  minutes?: number | null;
  notes?: string | null;
  reason?: string | null;
  relatedNsr?: number | null;
  relatedClockInId?: string | null;
  origin?: string;
  fonteMarc?: 'O' | 'I' | null;
  tpMarc?: 'D' | null;
  createdAt: Timestamp | Date;
  createdBy: string;
  createdByEmail?: string | null;
  retentionUntil?: Timestamp | Date;
  retentionYears?: number;
  parallelToAfd: true;
  auditTrail?: Record<string, unknown>;
}

export interface EspelhoAcknowledgement {
  businessId: string;
  userId: string;
  month: string;
  acknowledgedAt: Timestamp | Date;
  acceptedText: string;
  ipAddress?: string;
  userAgent?: string;
  /** Not a legal approval of payroll closing */
  doesNotConditionValidity: true;
}

export interface EspelhoContestacao {
  id: string;
  businessId: string;
  userId: string;
  month: string;
  message: string;
  status: 'open' | 'in_treatment' | 'resolved';
  createdAt: Timestamp | Date;
  createdBy: string;
  /** Contestation never mutates ARP */
  doesNotAlterArp: true;
}
