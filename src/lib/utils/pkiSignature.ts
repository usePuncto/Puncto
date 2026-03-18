/**
 * PKI signature utilities for EMR (ICP-Brasil via Lacuna Web PKI).
 *
 * In production, this module will host the integration with the Lacuna Web PKI SDK.
 * For now, we simulate the signing step locally.
 */

/**
 * Compute a SHA-256 hash of a string.
 * Useful for hashing EMR payloads and consent texts.
 */
export async function sha256Hash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Placeholder for Lacuna Web PKI signing.
 *
 * TODO: Integrate the official Lacuna Web PKI SDK here. This function will:
 * - Initialize the SDK
 * - Prompt the doctor to select an ICP-Brasil certificate
 * - Perform a PKCS#7 signature of the payload hash
 * - Return the signed PKCS#7 (base64)
 */
export async function signWithLacunaWebPki(payloadHash: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulated PKCS#7 signature
      resolve(`MOCK_LACUNA_PKCS7_${payloadHash}`);
    }, 2000);
  });
}

