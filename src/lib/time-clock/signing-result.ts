export type SignatureResult = {
  status: 'signed' | 'pending_icp_cert' | 'failed';
  standard: 'CAdES-detached' | 'PAdES-embedded' | 'none';
  p7s?: Buffer;
  signedPdf?: Buffer;
  reason?: string;
  signerSubject?: string;
};
