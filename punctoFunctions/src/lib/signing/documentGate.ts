/**
 * Document-type gates — prevent generic signing oracle.
 * PFX/key used ONLY after these checks pass.
 */

export type SignOperation = 'signAfd' | 'signAej' | 'signRepPReceipt';

export function validateDocumentForOperation(
  operation: SignOperation,
  content: Buffer
): { ok: true } | { ok: false; reason: string } {
  if (operation === 'signRepPReceipt') {
    const head = content.subarray(0, 8).toString('ascii');
    if (!head.startsWith('%PDF-')) {
      return { ok: false, reason: 'signRepPReceipt exige PDF válido (%PDF-)' };
    }
    if (content.length < 512) {
      return { ok: false, reason: 'PDF comprovante inválido (tamanho)' };
    }
    return { ok: true };
  }

  const text = content.toString('latin1');

  if (operation === 'signAfd') {
    const lines = text.split('\r\n').filter(Boolean);
    if (lines.length < 3) {
      return { ok: false, reason: 'AFD deve conter cabeçalho + registros + trailer' };
    }
    const header = lines[0];
    if (header.length < 250) {
      return { ok: false, reason: 'Cabeçalho AFD 004 inválido (comprimento)' };
    }
    if (!header.includes('004')) {
      return { ok: false, reason: 'AFD layout 004 não identificado' };
    }
    if (!header.startsWith('000000000')) {
      return { ok: false, reason: 'AFD deve iniciar com NSR 000000000 no cabeçalho' };
    }
    const trailerLine = lines[lines.length - 2] || '';
    if (!/^\d{9}9/.test(trailerLine)) {
      return { ok: false, reason: 'Trailer AFD tipo 9 não encontrado' };
    }
    return { ok: true };
  }

  if (operation === 'signAej') {
    const first = text.split('\n')[0]?.trim() || '';
    if (!first.startsWith('01|')) {
      return { ok: false, reason: 'AEJ deve iniciar com registro 01|' };
    }
    if (!text.includes('\n02|')) {
      return { ok: false, reason: 'AEJ registro 02 (REP-P) ausente' };
    }
    return { ok: true };
  }

  return { ok: false, reason: 'Operação desconhecida' };
}
