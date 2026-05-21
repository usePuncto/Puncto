import { INDUSTRY_TO_KEY } from '@/lib/features/businessTypeFeatures';

/** Pricing / marketing segment keys that expose the electronic signature admin tab */
const ELECTRONIC_SIGNATURE_SEGMENT_KEYS = new Set(['saude', 'empresas', 'corporativo']);

const HEALTH_INDUSTRIES = new Set(['clinic', 'health', 'healthcare', 'saude']);

/**
 * Whether the tenant admin sidebar should show "Assinatura eletrônica".
 * Covers Saúde (clinic) and gestão administrativa (empresas / corporativo).
 */
export function supportsElectronicSignatureTab(industry: string | undefined): boolean {
  if (!industry) return false;
  if (HEALTH_INDUSTRIES.has(industry)) return true;
  const segmentKey = INDUSTRY_TO_KEY[industry] ?? industry;
  return ELECTRONIC_SIGNATURE_SEGMENT_KEYS.has(segmentKey);
}

export function isHealthIndustryForElectronicSignature(industry: string | undefined): boolean {
  if (!industry) return false;
  if (HEALTH_INDUSTRIES.has(industry)) return true;
  return (INDUSTRY_TO_KEY[industry] ?? industry) === 'saude';
}
