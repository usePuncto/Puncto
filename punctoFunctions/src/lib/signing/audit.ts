/**
 * Structured audit log for REP-P signing (no secrets, no raw cert, no content).
 */
export type SigningAuditEntry = {
  correlationId: string;
  operation: 'signAfd' | 'signAej' | 'signRepPReceipt' | 'validateVendorCert';
  establishmentId: string | null;
  contentSha256: string | null;
  certVersion: string | null;
  result: 'signed' | 'validated' | 'rejected' | 'failed';
  reason?: string;
  timestamp: string;
  callerEnv?: string;
};

export function logSigningAudit(entry: SigningAuditEntry): void {
  console.log(
    JSON.stringify({
      audit: 'rep_p_signing',
      ...entry,
    })
  );
}

export function newCorrelationId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
