'use client';

import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface PatientSignaturePadProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
}

export function PatientSignaturePad({ open, onClose, onConfirm }: PatientSignaturePadProps) {
  const sigRef = useRef<SignatureCanvas | null>(null);

  if (!open) return null;

  const handleClear = () => {
    sigRef.current?.clear();
  };

  const handleConfirm = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert('Por favor, peça ao paciente para assinar antes de confirmar.');
      return;
    }
    const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
    onConfirm(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col">
        <div className="border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Assinatura do Paciente</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs text-neutral-600 mb-2">
            Peça ao paciente para assinar no espaço abaixo. Compatível com telas de toque.
          </p>
          <div className="border border-neutral-300 rounded-lg overflow-hidden">
            <SignatureCanvas
              ref={sigRef}
              penColor="#111827"
              canvasProps={{
                width: 400,
                height: 200,
                className: 'w-full h-48 touch-manipulation',
              }}
            />
          </div>
        </div>
        <div className="px-4 py-3 border-t border-neutral-200 flex justify-between gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
          >
            Confirmar Assinatura
          </button>
        </div>
      </div>
    </div>
  );
}

