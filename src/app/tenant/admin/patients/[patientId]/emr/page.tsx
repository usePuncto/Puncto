'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { FeatureGuard } from '@/components/features/FeatureGuard';
import { sha256Hash, signWithLacunaWebPki } from '@/lib/utils/pkiSignature';
import Link from 'next/link';

const emrSchema = z.object({
  patientComplaint: z.string().min(1, 'Queixa do paciente é obrigatória'),
  clinicalEvolution: z.string().min(1, 'Evolução clínica é obrigatória'),
  diagnosis: z.string().min(1, 'Diagnóstico é obrigatório'),
  prescriptionNotes: z.string().optional(),
});

type EMRFormData = z.infer<typeof emrSchema>;

function EMRFormContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  const { business } = useBusiness();
  const patientId = params.patientId as string;

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completeStatus, setCompleteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emrId, setEmrId] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<EMRFormData | null>(null);

  const patientNameFromUrl = searchParams.get('name') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EMRFormData>({
    resolver: zodResolver(emrSchema),
    defaultValues: {
      patientComplaint: '',
      clinicalEvolution: '',
      diagnosis: '',
      prescriptionNotes: '',
    },
  });

  const onSubmit = async (data: EMRFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = { ...data };
      setLastPayload(payload);

      if (!business?.id) {
        setError('Negócio não encontrado');
        setIsSubmitting(false);
        return;
      }

      const token = firebaseUser ? await firebaseUser.getIdToken() : null;

      let currentEmrId = emrId;

      // Create draft only once; reuse on subsequent signatures if needed
      if (!currentEmrId) {
        const draftRes = await fetch('/api/emr/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            businessId: business.id,
            patientId,
            payload,
          }),
        });

        if (!draftRes.ok) {
          const err = await draftRes.json().catch(() => ({}));
          throw new Error(err.error || 'Erro ao salvar rascunho');
        }

        const draftData = await draftRes.json();
        currentEmrId = draftData.emrId as string;
        setEmrId(currentEmrId);
      }

      // Hash payload and perform PKI signature with Lacuna Web PKI (simulated)
      const payloadHash = await sha256Hash(JSON.stringify(payload));
      const signedHash = await signWithLacunaWebPki(payloadHash);

      const completeRes = await fetch('/api/emr/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(firebaseUser ? { Authorization: `Bearer ${await firebaseUser.getIdToken()}` } : {}),
        },
        body: JSON.stringify({
          emrId: currentEmrId,
          businessId: business.id,
          patientId,
          signedHash,
        }),
      });

      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao concluir prontuário');
      }

      setCompleteStatus('success');
      queryClient.invalidateQueries({ queryKey: ['emrs', business.id, patientId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar');
      setIsSubmitting(false);
    }
  };

  if (completeStatus === 'success' && lastPayload) {
    return (
      <div className="max-w-2xl mx-auto bg-white text-black print:bg-white print:text-black print:p-8">
        {/* On-screen success banner, hidden in print */}
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 print:hidden">
          <h2 className="text-sm font-semibold text-green-800 mb-1">
            Prontuário assinado com sucesso
          </h2>
          <p className="text-xs text-neutral-700 mb-2">
            O prontuário foi salvo e assinado digitalmente. Agora você pode imprimir ou salvar em PDF.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
            >
              Imprimir / Salvar em PDF
            </button>
            <button
              type="button"
              onClick={() => router.push('/tenant/admin/customers')}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Voltar aos pacientes
            </button>
          </div>
        </div>

        {/* Printable EMR document */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-neutral-900 print:text-black">
            Prontuário Clínico
          </h1>
          <p className="mt-2 text-neutral-600 print:text-black">
            Registro clínico do paciente
          </p>

          <div className="mt-6 space-y-6 text-sm">
            <div>
              <h3 className="font-semibold text-neutral-800 mb-1">Queixa do paciente</h3>
              <p className="text-neutral-800 whitespace-pre-wrap">
                {lastPayload.patientComplaint}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 mb-1">Evolução clínica</h3>
              <p className="text-neutral-800 whitespace-pre-wrap">
                {lastPayload.clinicalEvolution}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 mb-1">Diagnóstico</h3>
              <p className="text-neutral-800 whitespace-pre-wrap">
                {lastPayload.diagnosis}
              </p>
            </div>
            {lastPayload.prescriptionNotes && (
              <div>
                <h3 className="font-semibold text-neutral-800 mb-1">Prescrição / Observações</h3>
                <p className="text-neutral-800 whitespace-pre-wrap">
                  {lastPayload.prescriptionNotes}
                </p>
              </div>
            )}
          </div>

          {/* Signature + disclaimer (printed) */}
          <div className="mt-12 text-sm text-neutral-900">
            <p className="mt-8">
              _____________________________________________________
            </p>
            <p className="mt-2">
              Assinatura e Carimbo do Profissional
            </p>
            <p className="mt-6 text-xs leading-relaxed">
              Atenção: Este documento requer assinatura física e carimbo do profissional de saúde para
              possuir validade legal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white text-black print:bg-white print:text-black print:p-8">
      <div className="mb-6 print:hidden">
        <Link
          href="/tenant/admin/customers"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Voltar aos pacientes
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-neutral-900 print:text-black">Preencher prontuário (EMR)</h1>
      <p className="mt-2 text-neutral-600 print:text-black">
        Registro clínico
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-6 rounded-xl border border-neutral-200 bg-white p-6 print:border-0 print:p-0"
      >
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Queixa do paciente *
          </label>
          <textarea
            {...register('patientComplaint')}
            rows={3}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            placeholder="Descreva a queixa principal do paciente"
          />
          {errors.patientComplaint && (
            <p className="mt-1 text-sm text-red-600">{errors.patientComplaint.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Evolução clínica *
          </label>
          <textarea
            {...register('clinicalEvolution')}
            rows={4}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            placeholder="Registro da evolução clínica durante o atendimento"
          />
          {errors.clinicalEvolution && (
            <p className="mt-1 text-sm text-red-600">{errors.clinicalEvolution.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Diagnóstico *</label>
          <textarea
            {...register('diagnosis')}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            placeholder="Diagnóstico ou hipótese diagnóstica"
          />
          {errors.diagnosis && (
            <p className="mt-1 text-sm text-red-600">{errors.diagnosis.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Prescrição / Observações
          </label>
          <textarea
            {...register('prescriptionNotes')}
            rows={3}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            placeholder="Medicamentos, orientações ou observações adicionais"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 print:hidden">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar e Imprimir'}
          </button>
          <Link
            href="/tenant/admin/customers"
            className="rounded-xl border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancelar
          </Link>
        </div>

        {/* Print-only signature area */}
        <div className="hidden print:block mt-12 text-sm text-neutral-900">
          <p className="mt-8">
            _____________________________________________________
          </p>
          <p className="mt-2">
            Assinatura e Carimbo do Profissional
          </p>
          <p className="mt-6 text-xs leading-relaxed">
            Atenção: Este documento requer assinatura física e carimbo do profissional de saúde para
            possuir validade legal.
          </p>
        </div>
      </form>
    </div>
  );
}

export default function EMRPage() {
  return (
    <FeatureGuard feature="healthRecords" showMessage>
      <EMRFormContent />
    </FeatureGuard>
  );
}
