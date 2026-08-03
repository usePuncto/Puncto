import { Timestamp, GeoPoint } from 'firebase/firestore';

export type ClockInType = 'in' | 'out' | 'break_start' | 'break_end';

export type TimestampSource = 'ntp_br_on' | 'server_fallback';

/**
 * Original punch mark (AFD source). Immutable after write.
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
  previousHash?: string | null;
  afdHash?: string;
  integrityHash?: string;
  employeeCpf?: string | null;
  employeeName?: string;
  collectorId?: string;
  offline?: boolean;
  immutable?: boolean;
  retentionUntil?: Timestamp | Date;
  retentionYears?: number;
  location?: GeoPoint | { lat: number; lng: number } | null;
  deviceId?: string;
  ipAddress?: string | null;
  clientReportedAt?: string | null;
  /** RH review metadata — does not alter AFD payload */
  rhReviewed?: boolean;
  rhReviewedBy?: string | null;
  rhReviewedAt?: Timestamp | Date | null;
  rhNotes?: string;
  /** @deprecated legacy — mapped to rhReviewed for old rows */
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

/** Parallel treatment row — never overwrites ClockIn */
export interface TimeClockAdjustment {
  id: string;
  businessId: string;
  userId: string;
  employeeCpf?: string | null;
  kind: 'absence' | 'medical' | 'time_bank' | 'manual_insert' | 'other';
  date: Timestamp | Date;
  minutes?: number | null;
  notes?: string | null;
  relatedNsr?: number | null;
  relatedClockInId?: string | null;
  createdAt: Timestamp | Date;
  createdBy: string;
  retentionUntil?: Timestamp | Date;
  retentionYears?: number;
  parallelToAfd: true;
}
