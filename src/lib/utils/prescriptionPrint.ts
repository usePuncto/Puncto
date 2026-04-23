import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PrintPrescriptionOptions {
  patientName: string;
  professionalName: string;
  professionalAddress: string;
  prescribedAt: Date;
  medications: string;
  additionalInstructions?: string;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function printPrescription({
  patientName,
  professionalName,
  professionalAddress,
  prescribedAt,
  medications,
  additionalInstructions,
}: PrintPrescriptionOptions): void {
  if (typeof window === 'undefined') return;

  const prescribedAtText = format(prescribedAt, 'dd/MM/yyyy', { locale: ptBR });
  const content = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receituário - ${escapeHtml(patientName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem; color: #171717; background: #fff; max-width: 44rem; margin: 0 auto; }
    h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.35rem 0; text-transform: uppercase; }
    .header-meta { margin-bottom: 1.5rem; border-bottom: 1px solid #e5e5e5; padding-bottom: 1rem; font-size: 0.9rem; }
    .header-meta p { margin: 0.25rem 0; }
    .section { margin-bottom: 1.5rem; }
    .section h2 { font-size: 1rem; font-weight: 700; margin: 0 0 0.5rem 0; }
    .body-text { white-space: pre-wrap; line-height: 1.6; font-size: 0.95rem; margin: 0; }
    .signature { margin-top: 3.5rem; font-size: 0.9rem; }
    .signature-line { margin-top: 2.25rem; }
    .signature-label { margin-top: 0.35rem; }
  </style>
</head>
<body>
  <h1>Receituário</h1>
  <div class="header-meta">
    <p><strong>Profissional:</strong> ${escapeHtml(professionalName || 'Não informado')}</p>
    <p><strong>Endereço:</strong> ${escapeHtml(professionalAddress || 'Não informado')}</p>
    <p><strong>Data da prescrição:</strong> ${escapeHtml(prescribedAtText)}</p>
    <p><strong>Paciente:</strong> ${escapeHtml(patientName)}</p>
  </div>

  <div class="section">
    <h2>Medicamentos prescritos</h2>
    <p class="body-text">${escapeHtml(medications.trim())}</p>
  </div>

  ${
    additionalInstructions?.trim()
      ? `<div class="section">
    <h2>Orientações adicionais</h2>
    <p class="body-text">${escapeHtml(additionalInstructions.trim())}</p>
  </div>`
      : ''
  }

  <div class="signature">
    <p class="signature-line">_____________________________________________________</p>
    <p class="signature-label">Assinatura e Carimbo do Profissional</p>
  </div>

</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    cleanup();
    alert('Não foi possível abrir a impressão do receituário.');
    return;
  }

  iframeDoc.open();
  iframeDoc.write(content);
  iframeDoc.close();

  const runPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // Fallback cleanup in case afterprint does not fire.
      window.setTimeout(cleanup, 1500);
    }
  };

  iframe.onload = () => {
    iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(runPrint, 100);
  };

  // If onload doesn't fire in some browsers for document.write, still print.
  window.setTimeout(() => {
    if (document.body.contains(iframe)) {
      runPrint();
    }
  }, 250);
}
