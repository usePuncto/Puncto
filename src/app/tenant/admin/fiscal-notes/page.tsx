'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  FISCAL_NOTE_STATUS_LABELS,
  FISCAL_NOTE_TYPE_LABELS,
  type FiscalNoteStatus,
  type FiscalNoteType,
} from '@/types/fiscalNote';

type NoteRow = {
  id: string;
  type: FiscalNoteType;
  number: string;
  series?: string | null;
  accessKey?: string | null;
  issueDate?: string | null;
  customerName?: string | null;
  customerDocument?: string | null;
  amount: number;
  status: FiscalNoteStatus;
  description?: string | null;
  externalUrl?: string | null;
  pdfDownloadUrl?: string | null;
  xmlDownloadUrl?: string | null;
  pdfFileName?: string | null;
  xmlFileName?: string | null;
};

const emptyForm = {
  type: 'nfse' as FiscalNoteType,
  number: '',
  series: '',
  accessKey: '',
  issueDate: new Date().toISOString().slice(0, 10),
  customerName: '',
  customerDocument: '',
  amount: '',
  status: 'stored' as FiscalNoteStatus,
  description: '',
  externalUrl: '',
};

function formatMoney(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

export default function FiscalNotesAdminPage() {
  const { business } = useBusiness();
  const { firebaseUser } = useAuth();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [totals, setTotals] = useState({ count: 0, amount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [typeFilter, setTypeFilter] = useState('');
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const authHeaders = useCallback(async () => {
    const token = await firebaseUser?.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [firebaseUser]);

  const load = useCallback(async () => {
    if (!business?.id || !firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams({
        businessId: business.id,
        month,
        limit: '200',
      });
      if (typeFilter) params.set('type', typeFilter);
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/fiscal-notes?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar notas');
      setNotes(data.notes || []);
      setTotals(data.totals || { count: 0, amount: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, business?.id, firebaseUser, month, typeFilter, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const createNote = async () => {
    if (!business?.id) return;
    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/fiscal-notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          businessId: business.id,
          type: form.type,
          number: form.number,
          series: form.series || undefined,
          accessKey: form.accessKey || undefined,
          issueDate: form.issueDate,
          customerName: form.customerName || undefined,
          customerDocument: form.customerDocument || undefined,
          amount: Number(form.amount),
          status: form.status,
          description: form.description || undefined,
          externalUrl: form.externalUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async (id: string) => {
    if (!business?.id || !confirm('Remover esta nota do arquivo?')) return;
    const token = await firebaseUser?.getIdToken();
    const res = await fetch(
      `/api/fiscal-notes/${id}?businessId=${business.id}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Erro ao remover');
      return;
    }
    await load();
  };

  const uploadFile = async (noteId: string, kind: 'xml' | 'pdf', file: File) => {
    if (!business?.id || !firebaseUser) return;
    setUploadingId(noteId);
    try {
      const token = await firebaseUser.getIdToken();
      const formData = new FormData();
      formData.append('businessId', business.id);
      formData.append('kind', kind);
      formData.append('file', file);
      const res = await fetch(`/api/fiscal-notes/${noteId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setUploadingId(null);
    }
  };

  const csvHref = useMemo(() => {
    if (!notes.length) return null;
    const header = [
      'tipo',
      'numero',
      'serie',
      'chave',
      'data',
      'cliente',
      'documento',
      'valor',
      'status',
    ];
    const rows = notes.map((n) =>
      [
        n.type,
        n.number,
        n.series || '',
        n.accessKey || '',
        n.issueDate || '',
        n.customerName || '',
        n.customerDocument || '',
        String(n.amount),
        n.status,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    return URL.createObjectURL(blob);
  }, [notes]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Gestão de NF</h1>
          <p className="mt-2 text-neutral-600">
            Arquive e consulte NFS-e, NFC-e e NF-e emitidas pelo seu contador ou emissor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {showForm ? 'Fechar formulário' : 'Registrar nota'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Nova nota no arquivo</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FiscalNoteType }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {Object.entries(FISCAL_NOTE_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <input
              placeholder="Número"
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Série"
              value={form.series}
              onChange={(e) => setForm((f) => ({ ...f, series: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.issueDate}
              onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Valor (R$)"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as FiscalNoteStatus }))
              }
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {Object.entries(FISCAL_NOTE_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <input
              placeholder="Cliente"
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="CPF/CNPJ do cliente"
              value={form.customerDocument}
              onChange={(e) => setForm((f) => ({ ...f, customerDocument: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Chave de acesso (44 dígitos)"
              value={form.accessKey}
              onChange={(e) => setForm((f) => ({ ...f, accessKey: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              placeholder="URL externa (DANFE / portal)"
              value={form.externalUrl}
              onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              placeholder="Observações"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-3"
            />
          </div>
          <button
            type="button"
            disabled={saving || !form.number || !form.amount}
            onClick={() => void createNote()}
            className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar no arquivo'}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Mês</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Tipo</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(FISCAL_NOTE_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-sm font-medium text-neutral-700">Busca</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Número, cliente, chave..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          Atualizar
        </button>
        {csvHref && (
          <a
            href={csvHref}
            download={`notas-fiscais-${month}.csv`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Exportar CSV
          </a>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Notas no filtro</p>
          <p className="text-2xl font-semibold">{totals.count}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Valor total</p>
          <p className="text-2xl font-semibold">{formatMoney(totals.amount)}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Nenhuma nota neste período. Registre notas emitidas fora da Puncto para manter o arquivo
          organizado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">Número</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">Data</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">Arquivos</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {notes.map((n) => (
                <tr key={n.id}>
                  <td className="px-4 py-3">{FISCAL_NOTE_TYPE_LABELS[n.type] || n.type}</td>
                  <td className="px-4 py-3 font-medium">
                    {n.number}
                    {n.series ? ` / ${n.series}` : ''}
                  </td>
                  <td className="px-4 py-3">{formatDate(n.issueDate)}</td>
                  <td className="px-4 py-3">
                    <div>{n.customerName || '—'}</div>
                    {n.customerDocument && (
                      <div className="text-xs text-neutral-500">{n.customerDocument}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatMoney(Number(n.amount) || 0)}</td>
                  <td className="px-4 py-3">
                    {FISCAL_NOTE_STATUS_LABELS[n.status] || n.status}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs">
                      {n.pdfDownloadUrl ? (
                        <a
                          href={n.pdfDownloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          PDF{n.pdfFileName ? `: ${n.pdfFileName}` : ''}
                        </a>
                      ) : (
                        <label className="cursor-pointer text-neutral-500 hover:text-neutral-800">
                          + PDF
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            disabled={uploadingId === n.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void uploadFile(n.id, 'pdf', f);
                            }}
                          />
                        </label>
                      )}
                      {n.xmlDownloadUrl ? (
                        <a
                          href={n.xmlDownloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          XML{n.xmlFileName ? `: ${n.xmlFileName}` : ''}
                        </a>
                      ) : (
                        <label className="cursor-pointer text-neutral-500 hover:text-neutral-800">
                          + XML
                          <input
                            type="file"
                            accept=".xml,application/xml,text/xml"
                            className="hidden"
                            disabled={uploadingId === n.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void uploadFile(n.id, 'xml', f);
                            }}
                          />
                        </label>
                      )}
                      {n.externalUrl && (
                        <a
                          href={n.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Link externo
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void removeNote(n.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
