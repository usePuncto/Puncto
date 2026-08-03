/**
 * Extract PEM certificate + private key from a PKCS#12 (.pfx / .p12) buffer.
 * Used when signing AEJ with the employer's uploaded e-CNPJ A1.
 */

import forge from 'node-forge';

export type PfxPemMaterial = {
  certPem: string;
  keyPem: string;
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.PrivateKey;
  subjectCN: string;
  subjectRaw: string;
  /** CNPJ/CPF digits extracted from CN when present (e.g. RAZAO:00000000000000) */
  taxIdFromCert: string | null;
  validFrom: Date;
  validTo: Date;
};

function matchCertToKey(
  certBags: Array<{ cert?: forge.pki.Certificate }>,
  privateKey: forge.pki.PrivateKey
): forge.pki.Certificate | undefined {
  const rsaKey = privateKey as forge.pki.rsa.PrivateKey;
  for (const bag of certBags) {
    if (!bag.cert) continue;
    try {
      const pubFromCert = forge.pki.publicKeyToPem(bag.cert.publicKey);
      const pubFromKey = forge.pki.publicKeyToPem(
        forge.pki.rsa.setPublicKey(rsaKey.n, rsaKey.e)
      );
      if (pubFromCert === pubFromKey) return bag.cert;
    } catch {
      /* continue */
    }
  }
  return certBags.find((b) => b.cert)?.cert;
}

function extractTaxId(cn: string): string | null {
  const m = cn.match(/:(\d{11,14})$/);
  return m ? m[1] : null;
}

export function extractPemFromPfx(
  pfxBuffer: Buffer,
  password: string
): PfxPemMaterial {
  const der = pfxBuffer.toString('binary');
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] ||
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ||
    [];
  const certBags =
    p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];

  const privateKey = keyBags[0]?.key;
  if (!privateKey) {
    throw new Error('PFX sem chave privada');
  }

  const certificate = matchCertToKey(certBags, privateKey);
  if (!certificate) {
    throw new Error('PFX sem certificado correspondente à chave');
  }

  const subjectCN = (certificate.subject.getField('CN')?.value as string) || '';
  const subjectRaw = certificate.subject.attributes
    .map((a) => `${a.shortName || a.name}=${a.value}`)
    .join(', ');

  return {
    certPem: forge.pki.certificateToPem(certificate),
    keyPem: forge.pki.privateKeyToPem(privateKey),
    certificate,
    privateKey,
    subjectCN,
    subjectRaw,
    taxIdFromCert: extractTaxId(subjectCN),
    validFrom: certificate.validity.notBefore,
    validTo: certificate.validity.notAfter,
  };
}

/** Inspect PFX without keeping material longer than needed */
export function inspectPfx(pfxBuffer: Buffer, password: string) {
  const m = extractPemFromPfx(pfxBuffer, password);
  return {
    subjectCN: m.subjectCN,
    subjectRaw: m.subjectRaw,
    taxIdFromCert: m.taxIdFromCert,
    validFrom: m.validFrom.toISOString(),
    validTo: m.validTo.toISOString(),
  };
}
