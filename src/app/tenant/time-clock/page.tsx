'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { ClockInType } from '@/types/timeClock';
import { hasModuleAccess } from '@/lib/features/moduleAccess';

type StatusPayload = {
  displayName?: string;
  activeShift: {
    id: string;
    startTime?: string | null;
    breakStartedAt?: string | null;
    breakDuration?: number;
    totalHours?: number;
  } | null;
  lastClockIn: {
    id?: string;
    type: ClockInType;
    timestamp?: string | null;
    nsr?: number | null;
    receiptStatus?: string | null;
  } | null;
  onBreak: boolean;
  suggestedActions?: ClockInType[];
  availableActions?: ClockInType[];
  nextActions?: ClockInType[];
  serverLegalTime?: { iso: string; source: string; ntpServer?: string | null };
};

const ALL_ACTIONS: ClockInType[] = ['in', 'break_start', 'break_end', 'out'];

const ACTION_META: Record<ClockInType, { label: string; className: string }> = {
  in: { label: 'Entrada', className: 'bg-green-600 hover:bg-green-700' },
  break_start: { label: 'Início do intervalo', className: 'bg-amber-500 hover:bg-amber-600' },
  break_end: { label: 'Fim do intervalo', className: 'bg-blue-600 hover:bg-blue-700' },
  out: { label: 'Saída', className: 'bg-red-600 hover:bg-red-700' },
};

export default function TimeClockPage() {
  const { business } = useBusiness();
  const { user, firebaseUser } = useAuth();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);

  const moduleEnabled = business ? hasModuleAccess(business, 'ponto_eletronico') : false;

  const loadStatus = useCallback(async () => {
    if (!business?.id || !firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/time-clock/status?businessId=${business.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar status');
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [business?.id, firebaseUser]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const downloadReceipt = async (clockInId: string) => {
    if (!business?.id || !firebaseUser) return;
    const token = await firebaseUser.getIdToken();
    const res = await fetch(
      `/api/time-clock/receipts?businessId=${business.id}&clockInId=${clockInId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      alert('Comprovante indisponível');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante-${clockInId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClockIn = async (type: ClockInType) => {
    if (!business?.id || !firebaseUser) return;
    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      let location: { lat: number; lng: number } | undefined;
      let locationPurpose: string | undefined;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          locationPurpose =
            'Validação de jornada no momento da marcação (dado pessoal; coleta pontual, sem rastreamento contínuo)';
        } catch {
          // optional
        }
      }

      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/time-clock/clock', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: business.id,
          type,
          location,
          locationPurpose,
          deviceId: 'web',
          // Explicitly sent only for audit — server ignores for official time
          clientReportedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar ponto');

      setLastReceiptId(data.id || null);
      const nsrLabel = data.nsr != null ? ` · NSR ${String(data.nsr).padStart(9, '0')}` : '';
      setMessage(`Marcação registrada${nsrLabel}. Comprovante PDF disponível para download.`);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar ponto');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-neutral-600">Faça login para registrar o ponto.</p>
      </div>
    );
  }

  if (business && !moduleEnabled && business.enabledModules) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-neutral-900">Ponto indisponível</h1>
          <p className="mt-2 text-sm text-neutral-600">
            O módulo de ponto eletrônico não está ativo para este negócio.
          </p>
          <Link href="/tenant/admin/dashboard" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Voltar ao painel
          </Link>
        </div>
      </div>
    );
  }

  const suggested = new Set(
    status?.suggestedActions || status?.nextActions || []
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {business?.displayName || 'Puncto'}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-neutral-900">Ponto Eletrônico</h1>
          <p className="mt-2 text-sm text-neutral-600">
            {status?.displayName || user.displayName || user.email}
          </p>
          <p className="mt-2 text-[11px] text-neutral-500">
            Identificação pela sua conta Firebase. Se a localização do navegador for
            solicitada, ela é coletada só no instante da batida (dado pessoal, não sensível),
            sem rastreamento contínuo.
          </p>
          {status?.serverLegalTime && (
            <p className="mt-2 text-[11px] text-neutral-400">
              Hora Legal Brasileira (servidor)
              {status.serverLegalTime.source === 'ntp_br_on' ? ' via NTP.br' : ''}
              :{' '}
              {new Date(status.serverLegalTime.iso).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
              })}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
          </div>
        ) : (
          <>
            {status?.activeShift ? (
              <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-900">Turno em andamento</p>
                <p className="mt-1 text-xs text-green-700">
                  Entrada:{' '}
                  {status.activeShift.startTime
                    ? new Date(status.activeShift.startTime).toLocaleString('pt-BR')
                    : '—'}
                </p>
                {typeof status.activeShift.totalHours === 'number' && (
                  <p className="text-xs text-green-700">
                    Horas até agora: {status.activeShift.totalHours.toFixed(2)}h
                  </p>
                )}
                {status.onBreak && (
                  <p className="mt-2 text-xs font-medium text-amber-700">Em intervalo</p>
                )}
              </div>
            ) : (
              <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                Nenhuma jornada ativa no espelho. Você pode registrar qualquer marcação a qualquer
                hora — o sistema não bloqueia por horário.
              </div>
            )}

            {message && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                {message}
                {lastReceiptId && (
                  <button
                    type="button"
                    onClick={() => void downloadReceipt(lastReceiptId)}
                    className="mt-2 block text-sm font-medium text-green-900 underline"
                  >
                    Baixar comprovante PDF
                  </button>
                )}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {ALL_ACTIONS.map((type) => {
                const isSuggested = suggested.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => void handleClockIn(type)}
                    disabled={isSubmitting}
                    className={`w-full rounded-xl px-6 py-4 text-lg font-semibold text-white disabled:opacity-50 ${ACTION_META[type].className} ${
                      isSuggested ? 'ring-2 ring-offset-2 ring-neutral-900' : 'opacity-90'
                    }`}
                  >
                    {isSubmitting ? 'Registrando...' : ACTION_META[type].label}
                    {!isSuggested && (
                      <span className="ml-2 text-xs font-normal opacity-80">(sempre liberado)</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-[11px] text-neutral-400">
              Horário oficial da marcação é o do servidor (HLB). O sistema não preenche horário
              contratual nem exige liberação de horas extras.
            </p>

            {status?.lastClockIn && (
              <div className="mt-6 text-center text-xs text-neutral-500">
                <p>
                  Último registro: {ACTION_META[status.lastClockIn.type]?.label} ·{' '}
                  {status.lastClockIn.timestamp
                    ? new Date(status.lastClockIn.timestamp).toLocaleString('pt-BR')
                    : '—'}
                  {status.lastClockIn.nsr != null
                    ? ` · NSR ${String(status.lastClockIn.nsr).padStart(9, '0')}`
                    : ''}
                </p>
                {status.lastClockIn.id && status.lastClockIn.receiptStatus === 'ready' && (
                  <button
                    type="button"
                    onClick={() => void downloadReceipt(status.lastClockIn!.id!)}
                    className="mt-2 text-blue-600 hover:underline"
                  >
                    Baixar último comprovante
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <Link href="/tenant/admin/time-clock" className="text-sm text-neutral-500 hover:text-neutral-800">
            Ir para gestão de ponto
          </Link>
        </div>
      </div>
    </div>
  );
}
