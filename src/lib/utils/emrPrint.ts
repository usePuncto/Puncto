/**
 * Opens the EMR (prontuário) in a new window and triggers print.
 * User can choose "Save as PDF" in the print dialog.
 */
import type { EMREmbedPayload } from '@/lib/queries/emr';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PrintEMROptions {
  patientName: string;
  payload: EMREmbedPayload;
  signedAt?: Date | unknown;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function printEmr({ patientName, payload, signedAt }: PrintEMROptions): void {
  if (typeof window === 'undefined') return;

  const signedAtStr = signedAt
    ? format(new Date(signedAt as Date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : '';

  const p = payload || {};
  const content = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prontuário - ${escapeHtml(patientName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem; color: #171717; background: #fff; max-width: 42rem; margin: 0 auto; }
    h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem 0; }
    .subtitle { color: #525252; margin: 0 0 1.5rem 0; font-size: 0.875rem; }
    .patient { font-size: 0.875rem; color: #525252; margin-bottom: 1.5rem; }
    .section { margin-bottom: 1.5rem; }
    .section h3 { font-size: 0.875rem; font-weight: 600; color: #262626; margin: 0 0 0.25rem 0; }
    .section p { font-size: 0.875rem; color: #262626; margin: 0; white-space: pre-wrap; line-height: 1.5; }
    .signature { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e5e5e5; font-size: 0.875rem; }
    .signature-space { margin: 2rem 0 0.5rem 0; font-size: 1rem; letter-spacing: 0.1em; }
    .signature-label { margin: 0.25rem 0; font-weight: 500; }
    .disclaimer { margin-top: 1.5rem; font-size: 0.75rem; color: #525252; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>Prontuário Clínico</h1>
  <p class="subtitle">Registro clínico do paciente</p>
  <p class="patient"><strong>Paciente:</strong> ${escapeHtml(patientName)}${signedAtStr ? ` &nbsp;|&nbsp; <strong>Assinado em:</strong> ${escapeHtml(signedAtStr)}` : ''}</p>

  <div class="section">
    <h3>Queixa do paciente</h3>
    <p>${escapeHtml((p.patientComplaint as string) || '—')}</p>
  </div>
  <div class="section">
    <h3>Evolução clínica</h3>
    <p>${escapeHtml((p.clinicalEvolution as string) || '—')}</p>
  </div>
  <div class="section">
    <h3>Diagnóstico</h3>
    <p>${escapeHtml((p.diagnosis as string) || '—')}</p>
  </div>
  ${p.prescriptionNotes ? `<div class="section">
    <h3>Prescrição / Observações</h3>
    <p>${escapeHtml(p.prescriptionNotes as string)}</p>
  </div>` : ''}

  <div class="signature">
    <p class="signature-space">_____________________________________________________</p>
    <p class="signature-label">Assinatura e Carimbo do Profissional</p>
    <p class="disclaimer">Atenção: Este documento requer assinatura física e carimbo do profissional de saúde para possuir validade legal.</p>
  </div>
</body>
</html>`;

  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank', 'noopener,noreferrer');

  if (!printWindow) {
    URL.revokeObjectURL(url);
    alert('Permita pop-ups para imprimir o prontuário.');
    return;
  }

  printWindow.onload = () => {
    URL.revokeObjectURL(url);
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };
}
