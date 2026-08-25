'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useAuth } from '@/lib/contexts/AuthContext';

type Tab = 'live' | 'history' | 'reports' | 'fiscal' | 'treatment';

type ShiftRow = {
  id: string;
  userId: string;
  userName?: string;
  startTime?: string | null;
  endTime?: string | null;
  breakDuration?: number;
  breakStartedAt?: string | null;
  totalHours?: number;
  overtimeHours?: number;
  status: string;
};

type ClockInRow = {
  id: string;
  userId: string;
  userName?: string;
  type: string;
  timestamp?: string | null;
  validated: boolean;
  nsr?: number;
  receiptStatus?: string;
  immutable?: boolean;
  timestampSource?: string;
};

type ReportRow = {
  shiftId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: string;
  overtime: string;
  breakDuration: number;
  status: string;
};

type AdjustmentRow = {
  id: string;
  userId: string;
  kind: string;
  date?: string | null;
  notes?: string | null;
  minutes?: number | null;
};

function typeLabel(type: string): string {
  if (type === 'in') return 'Entrada';
  if (type === 'out') return 'Saída';
  if (type === 'break_start') return 'Início intervalo';
  if (type === 'break_end') return 'Fim intervalo';
  return type;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, '0')}`,
  };
}

export default function AdminTimeClockPage() {
  const { business } = useBusiness();
  const { firebaseUser } = useAuth();
  const [tab, setTab] = useState<Tab>('live');
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [clockIns, setClockIns] = useState<ClockInRow[]>([]);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [reportTotals, setReportTotals] = useState({ hours: '0', overtime: '0', shifts: 0 });
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [fiscalMsg, setFiscalMsg] = useState<string | null>(null);
  const [adjForm, setAdjForm] = useState({
    userId: '',
    kind: 'manual_insert',
    date: new Date().toISOString().slice(0, 10),
    markAt: '',
    notes: '',
    reason: '',
    minutes: '',
  });

  const authHeaders = useCallback(async () => {
    const token = await firebaseUser?.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [firebaseUser]);

  const loadLive = useCallback(async () => {
    if (!business?.id || !firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const [shiftsRes, clockInsRes] = await Promise.all([
        fetch(`/api/time-clock/shifts?businessId=${business.id}&status=active`, { headers }),
        fetch(`/api/time-clock/clock-ins?businessId=${business.id}&limit=30`, { headers }),
      ]);
      const shiftsData = await shiftsRes.json();
      const clockInsData = await clockInsRes.json();
      if (!shiftsRes.ok) throw new Error(shiftsData.error || 'Erro ao carregar turnos');
      if (!clockInsRes.ok) throw new Error(clockInsData.error || 'Erro ao carregar registros');
      setShifts(shiftsData.shifts || []);
      setClockIns(clockInsData.clockIns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, business?.id, firebaseUser]);

  const loadHistory = useCallback(async () => {
    if (!business?.id || !firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const [shiftsRes, clockInsRes] = await Promise.all([
        fetch(`/api/time-clock/shifts?businessId=${business.id}`, { headers }),
        fetch(`/api/time-clock/clock-ins?businessId=${business.id}&limit=100`, { headers }),
      ]);
      const shiftsData = await shiftsRes.json();
      const clockInsData = await clockInsRes.json();
      if (!shiftsRes.ok) throw new Error(shiftsData.error || 'Erro ao carregar turnos');
      if (!clockInsRes.ok) throw new Error(clockInsData.error || 'Erro ao carregar registros');
      setShifts(shiftsData.shifts || []);
      setClockIns(clockInsData.clockIns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, business?.id, firebaseUser]);

  const loadReports = useCallback(async () => {
    if (!business?.id || !firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `/api/time-clock/reports?businessId=${business.id}&month=${month}`,
        { headers }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar relatório');
      setReport(data.report || []);
      setReportTotals({
        hours: data.totalHours || '0',
        overtime: data.totalOvertime || '0',
        shifts: data.totalShifts || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, business?.id, firebaseUser, month]);

  const loadAdjustments = useCallback(async () => {
    if (!business?.id || !firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/time-clock/adjustments?businessId=${business.id}`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar ajustes');
      setAdjustments(data.adjustments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, business?.id, firebaseUser]);

  useEffect(() => {
    if (tab === 'live') void loadLive();
    else if (tab === 'history') void loadHistory();
    else if (tab === 'reports') void loadReports();
    else if (tab === 'treatment') void loadAdjustments();
    else if (tab === 'fiscal') {
      setLoading(false);
    } else setLoading(false);
  }, [tab, loadLive, loadHistory, loadReports, loadAdjustments]);

  const reviewClockIn = async (clockInId: string, rhReviewed: boolean) => {
    if (!business?.id) return;
    setReviewingId(clockInId);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/time-clock/clock-ins', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ businessId: business.id, clockInId, rhReviewed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao revisar');
      setClockIns((prev) =>
        prev.map((c) => (c.id === clockInId ? { ...c, validated: rhReviewed } : c))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao revisar');
    } finally {
      setReviewingId(null);
    }
  };

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

  const downloadCsv = async () => {
    if (!business?.id || !firebaseUser) return;
    const token = await firebaseUser.getIdToken();
    const res = await fetch(
      `/api/time-clock/reports?businessId=${business.id}&month=${month}&format=csv`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      alert('Erro ao baixar CSV');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-ponto-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFiscal = async (kind: 'afd' | 'aej', format: 'txt' | 'p7s' = 'txt') => {
    if (!business?.id || !firebaseUser) return;
    setFiscalMsg(null);
    const { from, to } = monthRange(month);
    const token = await firebaseUser.getIdToken();
    const res = await fetch(
      `/api/time-clock/fiscal/${kind}?businessId=${business.id}&from=${from}&to=${to}&format=${format}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || `Erro ao exportar ${kind.toUpperCase()}`);
      return;
    }
    const status = res.headers.get('X-Signature-Status') || 'unknown';
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
      `${kind}-${month}.${format === 'p7s' ? 'p7s' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    setFiscalMsg(
      `${kind.toUpperCase()} (${format}) baixado. Status da assinatura: ${status}.`
    );
  };

  const createAdjustment = async () => {
    if (!business?.id || !adjForm.userId) {
      alert('Informe o userId do colaborador');
      return;
    }
    if (
      (adjForm.kind === 'manual_insert' || adjForm.kind === 'disregard') &&
      !(adjForm.reason || adjForm.notes)?.trim()
    ) {
      alert('Motivo obrigatório para inclusão manual ou desconsideração');
      return;
    }
    if (adjForm.kind === 'manual_insert' && !adjForm.markAt) {
      alert('Informe o horário incluído (markAt) para inclusão manual');
      return;
    }
    const headers = await authHeaders();
    const res = await fetch('/api/time-clock/adjustments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        businessId: business.id,
        userId: adjForm.userId,
        kind: adjForm.kind,
        date: adjForm.date,
        markAt: adjForm.markAt || undefined,
        notes: adjForm.notes || undefined,
        reason: adjForm.reason || adjForm.notes || undefined,
        minutes: adjForm.minutes ? Number(adjForm.minutes) : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Erro ao criar ajuste');
      return;
    }
    alert(data.message || 'Ajuste criado');
    void loadAdjustments();
  };

  const pendingCount = useMemo(
    () => clockIns.filter((c) => !c.validated).length,
    [clockIns]
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Ponto Eletrônico</h1>
          <p className="mt-2 text-neutral-600">
            REP-P · marcações imutáveis (AFD), tratamento paralelo (AEJ), comprovante e espelho.
          </p>
        </div>
        <Link
          href="/tenant/time-clock"
          className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Abrir batida de ponto
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {(
          [
            { id: 'live', label: 'Ao vivo' },
            { id: 'history', label: 'Histórico' },
            { id: 'treatment', label: 'Tratamento' },
            { id: 'fiscal', label: 'Arquivos fiscais' },
            { id: 'reports', label: 'Relatórios' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === item.id
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {item.label}
            {item.id === 'live' && pendingCount > 0 ? (
              <span className="ml-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] text-neutral-900">
                {pendingCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
        </div>
      ) : tab === 'fiscal' ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Arquivos fiscais (geração imediata)</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Selecione o período e baixe AFD 004 (.txt + .p7s) e AEJ 002 (.txt + .p7s) sob demanda.
              Assinaturas CAdES com certificado ICP-Brasil da Puncto. Sem prazo de 48h para geração.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Competência</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2"
                />
              </div>
              <button
                type="button"
                onClick={() => void exportFiscal('afd', 'txt')}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Gerar AFD (.txt)
              </button>
              <button
                type="button"
                onClick={() => void exportFiscal('afd', 'p7s')}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                Baixar AFD (.p7s)
              </button>
              <button
                type="button"
                onClick={() => void exportFiscal('aej', 'txt')}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Gerar AEJ (.txt)
              </button>
              <button
                type="button"
                onClick={() => void exportFiscal('aej', 'p7s')}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                Baixar AEJ (.p7s)
              </button>
            </div>
            {fiscalMsg && <p className="mt-4 text-sm text-neutral-700">{fiscalMsg}</p>}
          </div>
        </div>
      ) : tab === 'treatment' ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Inclusões por esquecimento usam o PTRP (nunca criam marcação original na ARP).
            Informe motivo obrigatório. O AFD permanece imutável; o AEJ diferencia fonte &quot;I&quot;.
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Novo ajuste de tratamento</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="userId do colaborador"
                value={adjForm.userId}
                onChange={(e) => setAdjForm((f) => ({ ...f, userId: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <select
                value={adjForm.kind}
                onChange={(e) => setAdjForm((f) => ({ ...f, kind: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="manual_insert">Inclusão manual (esquecimento)</option>
                <option value="disregard">Desconsiderar marcação</option>
                <option value="medical">Atestado médico</option>
                <option value="absence">Falta</option>
                <option value="time_bank">Banco de horas</option>
                <option value="other">Outro</option>
              </select>
              <input
                type="date"
                value={adjForm.date}
                onChange={(e) => setAdjForm((f) => ({ ...f, date: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                placeholder="Horário incluído"
                value={adjForm.markAt}
                onChange={(e) => setAdjForm((f) => ({ ...f, markAt: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Motivo (obrigatório p/ inclusão)"
                value={adjForm.reason}
                onChange={(e) => setAdjForm((f) => ({ ...f, reason: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                placeholder="Minutos (opcional)"
                value={adjForm.minutes}
                onChange={(e) => setAdjForm((f) => ({ ...f, minutes: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Observações"
                value={adjForm.notes}
                onChange={(e) => setAdjForm((f) => ({ ...f, notes: e.target.value }))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
              />
            </div>
            <button
              type="button"
              onClick={() => void createAdjustment()}
              className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              Registrar ajuste
            </button>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Ajustes recentes</h2>
            {adjustments.length === 0 ? (
              <p className="text-neutral-500">Nenhum ajuste</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {adjustments.map((a) => (
                  <li key={a.id} className="rounded border border-neutral-100 px-3 py-2">
                    <span className="font-medium">{a.kind}</span> · {a.userId.slice(0, 8)} ·{' '}
                    {formatDateTime(a.date)}
                    {a.notes ? ` — ${a.notes}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : tab === 'reports' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Mês</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2"
              />
            </div>
            <button
              type="button"
              onClick={() => void loadReports()}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => void downloadCsv()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Baixar CSV
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-xs text-neutral-500">Turnos</p>
              <p className="text-2xl font-semibold">{reportTotals.shifts}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-xs text-neutral-500">Horas trabalhadas</p>
              <p className="text-2xl font-semibold">{reportTotals.hours}h</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-xs text-neutral-500">Horas extras</p>
              <p className="text-2xl font-semibold">{reportTotals.overtime}h</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">Funcionário</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">Início</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">Fim</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">Horas</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">Extras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {report.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                      Nenhum turno neste mês
                    </td>
                  </tr>
                ) : (
                  report.map((row) => (
                    <tr key={row.shiftId}>
                      <td className="px-4 py-3 font-medium">{row.userName}</td>
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3">{row.startTime}</td>
                      <td className="px-4 py-3">{row.endTime}</td>
                      <td className="px-4 py-3">{row.hours}h</td>
                      <td className="px-4 py-3">{row.overtime}h</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">
              {tab === 'live' ? 'Turnos ativos' : 'Turnos'}
            </h2>
            {shifts.length === 0 ? (
              <p className="text-neutral-500">Nenhum turno {tab === 'live' ? 'ativo' : 'encontrado'}</p>
            ) : (
              <div className="space-y-3">
                {(tab === 'live' ? shifts : shifts.slice(0, 20)).map((shift) => (
                  <div key={shift.id} className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{shift.userName || 'Funcionário'}</p>
                        <p className="text-sm text-neutral-600">
                          Início: {formatDateTime(shift.startTime)}
                        </p>
                        {shift.endTime && (
                          <p className="text-sm text-neutral-600">
                            Fim: {formatDateTime(shift.endTime)}
                          </p>
                        )}
                        {typeof shift.totalHours === 'number' && (
                          <p className="text-sm text-neutral-600">
                            Horas: {shift.totalHours.toFixed(2)}h
                          </p>
                        )}
                        {shift.breakStartedAt && (
                          <p className="mt-1 text-xs text-amber-700">Em intervalo</p>
                        )}
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          shift.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {shift.status === 'active' ? 'Ativo' : shift.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">Registros originais (AFD)</h2>
            {clockIns.length === 0 ? (
              <p className="text-neutral-500">Nenhum registro</p>
            ) : (
              <div className="space-y-2">
                {clockIns.map((clockIn) => (
                  <div
                    key={clockIn.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {typeLabel(clockIn.type)}
                        <span className="ml-2 font-normal text-neutral-500">
                          · {clockIn.userName || clockIn.userId.slice(0, 8)}
                        </span>
                        {clockIn.nsr != null && (
                          <span className="ml-2 text-[10px] text-neutral-400">
                            NSR {String(clockIn.nsr).padStart(9, '0')}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDateTime(clockIn.timestamp)}
                        {clockIn.timestampSource === 'ntp_br_on' ? ' · HLB/NTP' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {clockIn.receiptStatus === 'ready' && (
                        <button
                          type="button"
                          onClick={() => void downloadReceipt(clockIn.id)}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
                        >
                          PDF
                        </button>
                      )}
                      {clockIn.validated ? (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                          Revisado RH
                        </span>
                      ) : (
                        <>
                          <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                            Pendente
                          </span>
                          <button
                            type="button"
                            disabled={reviewingId === clockIn.id}
                            onClick={() => void reviewClockIn(clockIn.id, true)}
                            className="rounded border border-green-300 bg-green-50 px-2 py-1 text-xs text-green-800 hover:bg-green-100 disabled:opacity-50"
                          >
                            Revisar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
