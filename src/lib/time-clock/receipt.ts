/**
 * Comprovante de Registro de Ponto do Trabalhador (REP-P).
 * PDF via pdf-lib with ByteRange placeholder + PAdES (ETSI.CAdES.detached) via @signpdf / Puncto PFX.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formatLegalDateTimeBr, sha256Hex } from './legal-time';
import { signPdfPadesEmbedded, type SignatureResult } from './signing';

export type ReceiptInput = {
  businessId: string;
  businessLegalName: string;
  businessTaxId: string;
  employeeName: string;
  employeeCpf: string;
  clockInId: string;
  nsr: number;
  type: string;
  markAt: Date;
  timeSource: string;
  ntpServer?: string;
  integrityHash: string;
  collectorLabel: string;
};

export type ReceiptResult = {
  pdf: Buffer;
  sha256: string;
  fileName: string;
  signature: SignatureResult;
  availableUntil: Date;
};

function typeLabel(type: string): string {
  if (type === 'in') return 'Entrada';
  if (type === 'out') return 'Saída';
  if (type === 'break_start') return 'Início de intervalo';
  if (type === 'break_end') return 'Fim de intervalo';
  return type;
}

async function buildUnsignedReceiptPdf(input: ReceiptInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { date, time, tz } = formatLegalDateTimeBr(input.markAt);

  let y = 780;
  const draw = (text: string, opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }) => {
    const f = opts?.bold ? fontBold : font;
    const size = opts?.size ?? 10;
    page.drawText(text, {
      x: 50,
      y,
      size,
      font: f,
      color: opts?.color ?? rgb(0.1, 0.1, 0.1),
      maxWidth: 495,
    });
    y -= size + 6;
  };

  draw('Comprovante de Registro de Ponto do Trabalhador', { bold: true, size: 14 });
  draw('REP-P — Portaria MTP nº 671/2021', { size: 9, color: rgb(0.35, 0.35, 0.35) });
  y -= 8;

  const rows: [string, string][] = [
    ['Empregador', input.businessLegalName],
    ['CNPJ/CPF', input.businessTaxId],
    ['Colaborador', input.employeeName],
    ['CPF', input.employeeCpf || 'Não informado'],
    ['Tipo', typeLabel(input.type)],
    ['Data (HLB)', date],
    ['Hora (HLB)', `${time} (${tz})`],
    ['NSR', String(input.nsr).padStart(9, '0')],
    ['Coletor', input.collectorLabel],
    [
      'Fonte do tempo',
      input.timeSource + (input.ntpServer ? ` · ${input.ntpServer}` : ''),
    ],
    ['Hash SHA-256', input.integrityHash],
    ['ID da marcação', input.clockInId],
  ];

  for (const [label, value] of rows) {
    page.drawText(`${label}:`, { x: 50, y, size: 10, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
    const lines = wrapText(value, 70);
    let lineY = y;
    for (const line of lines) {
      page.drawText(line, { x: 170, y: lineY, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
      lineY -= 12;
    }
    y = lineY - 4;
  }

  y -= 10;
  draw(
    'Marcação original imutável (AFD). Ajustes de jornada constam apenas do AEJ, sem alterar este registro.',
    { size: 8, color: rgb(0.35, 0.35, 0.35) }
  );
  draw(
    'Assinado digitalmente pela desenvolvedora (Puncto) no padrão PAdES (ETSI.CAdES.detached) com certificado ICP-Brasil.',
    { size: 8, color: rgb(0.35, 0.35, 0.35) }
  );

  // Leave bottom margin free for signature widget
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const lines: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    lines.push(rest.slice(0, maxChars));
    rest = rest.slice(maxChars);
  }
  if (rest) lines.push(rest);
  return lines;
}

export async function generatePunchReceipt(input: ReceiptInput): Promise<ReceiptResult> {
  const unsigned = await buildUnsignedReceiptPdf(input);
  const signature = await signPdfPadesEmbedded(unsigned, {
    signingTime: input.markAt,
    reason: `Comprovante de ponto NSR ${String(input.nsr).padStart(9, '0')}`,
  });

  const pdf = signature.signedPdf || unsigned;
  const sha256 = sha256Hex(pdf);

  const availableUntil = new Date(input.markAt);
  availableUntil.setHours(availableUntil.getHours() + 48);

  return {
    pdf,
    sha256,
    fileName: `comprovante-ponto-NSR${String(input.nsr).padStart(9, '0')}.pdf`,
    signature,
    availableUntil,
  };
}
