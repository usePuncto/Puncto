/**
 * PFX load — ONLY inside repPSigningService runtime (never returned to caller).
 * Values come from Firebase defineSecret() bindings — NOT .env files.
 */

let pfxValueSupplier: (() => string) | null = null;
let passwordValueSupplier: (() => string) | null = null;

let cached: { loadedAt: number; pfx: Buffer; password: string } | null = null;
const CACHE_MS = 5 * 60_000;

/** Called once from repPSigningService with defineSecret().value() suppliers */
export function bindVendorPfxSecrets(
  pfxSupplier: () => string,
  passwordSupplier: () => string
): void {
  pfxValueSupplier = pfxSupplier;
  passwordValueSupplier = passwordSupplier;
}

function decodePfxPayload(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 64) {
    return Buffer.from(trimmed.replace(/\s/g, ''), 'base64');
  }
  return Buffer.from(trimmed, 'binary');
}

export async function loadVendorPfxInternal(): Promise<{ pfx: Buffer; password: string }> {
  const now = Date.now();
  if (cached && now - cached.loadedAt < CACHE_MS) {
    return { pfx: cached.pfx, password: cached.password };
  }

  if (!pfxValueSupplier || !passwordValueSupplier) {
    throw new Error('Secrets PFX não vinculados ao Signing Service (defineSecret)');
  }

  const pfxRaw = pfxValueSupplier();
  const password = passwordValueSupplier().trim();
  if (!pfxRaw || !password) {
    throw new Error('Secrets REP_P_VENDOR_PFX ou REP_P_VENDOR_PFX_PASSWORD vazios');
  }

  const pfx = decodePfxPayload(pfxRaw);
  cached = { loadedAt: now, pfx, password };
  return { pfx, password };
}

export function clearVendorPfxCache(): void {
  cached = null;
}
