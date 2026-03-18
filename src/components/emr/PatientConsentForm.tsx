'use client';

import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import { sha256Hash } from '@/lib/utils/pkiSignature';

export const LGPD_CONSENT_TEXT = [
  'Autorizo a coleta e o tratamento dos meus dados pessoais e sensíveis (informações de saúde e histórico clínico) para fins de prestação de serviços de saúde, acompanhamento clínico, emissão de prontuário e demais atos necessários ao meu atendimento.',
  'Estou ciente de que meus dados serão armazenados de forma segura na plataforma Puncto, em conformidade com a LGPD (Lei nº 13.709/2018), podendo ser acessados apenas por profissionais autorizados e utilizados exclusivamente para finalidades relacionadas ao meu cuidado em saúde.',
  'Reconheço que a assinatura eletrônica aposta neste dispositivo e os registros de auditoria (IP, data, hora) possuem validade jurídica e podem ser utilizados como prova do meu consentimento livre, informado e inequívoco para o tratamento dos meus dados pessoais e sensíveis.',
].join('\n\n');

interface PatientConsentFormProps {
  businessId: string;
  patientId: string;
  onCompleted?: () => void;
}

export function PatientConsentForm({ businessId, patientId, onCompleted }: PatientConsentFormProps) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsCanvasEmpty(true);
  };

  const handleEndStroke = () => {
    if (!sigRef.current) return;
    setIsCanvasEmpty(sigRef.current.isEmpty());
  };

  const handleConfirm = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error('Por favor, peça ao paciente para assinar antes de confirmar.');
      return;
    }
    try {
      setIsSubmitting(true);
      const base64Image = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      const textHash = await sha256Hash(LGPD_CONSENT_TEXT);

      const res = await fetch('/api/emr/patient-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Image,
          patientId,
          businessId,
          textHash,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao registrar consentimento');
      }

      toast.success('Consentimento do paciente registrado com sucesso.');
      if (onCompleted) onCompleted();
      handleClear();
      setHasAgreedToTerms(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao registrar consentimento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDisabled = !hasAgreedToTerms || isCanvasEmpty || isSubmitting;

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900 mb-3">
        Consentimento do Paciente (LGPD)
      </h2>

      <div className="text-xs text-neutral-600 bg-neutral-50 p-4 rounded max-h-40 overflow-y-auto mb-3 whitespace-pre-line">
        {LGPD_CONSENT_TEXT}
      </div>

      <label className="flex items-start gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={hasAgreedToTerms}
          onChange={(e) => setHasAgreedToTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
        />
        <span className="text-xs text-neutral-800">
          Li e concordo com os termos de tratamento de dados (LGPD).
        </span>
      </label>

      <div className="mb-2">
        <p className="text-xs text-neutral-700 mb-1">Assine no espaço abaixo</p>
        <div className="border border-neutral-300 rounded bg-white overflow-hidden">
          <SignatureCanvas
            ref={sigRef}
            penColor="#111827"
            onEnd={handleEndStroke}
            canvasProps={{
              className: 'w-full h-40 touch-manipulation',
            }}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Limpar Assinatura
        </button>
        <button
          type="button"
          disabled={confirmDisabled}
          onClick={handleConfirm}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium text-white ${
            confirmDisabled
              ? 'bg-neutral-400 cursor-not-allowed'
              : 'bg-neutral-900 hover:bg-neutral-800'
          }`}
        >
          {isSubmitting ? 'Registrando...' : 'Confirmar Consentimento'}
        </button>
      </div>
    </div>
  );
}

