'use client';

import { useState, useMemo, useEffect } from 'react';
import { Customer } from '@/types/booking';
import { useBookings } from '@/lib/queries/bookings';
import { useUpdateCustomer } from '@/lib/queries/customers';
import {
  useAnamnesisForms,
  useAnamnesisResponsesForPatient,
  useSaveAnamnesisResponse,
} from '@/lib/queries/anamnesis';
import { useEmrsForPatient } from '@/lib/queries/emr';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AnamnesisForm as AnamnesisFormType, AnamnesisFormField } from '@/types/anamnesis';
import { printEmr } from '@/lib/utils/emrPrint';

function normalizePhone(phone: string | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

interface ProntuarioTabProps {
  businessId: string;
  patientId: string;
  patientName: string;
  forms: AnamnesisFormType[];
  responses: import('@/types/anamnesis').AnamnesisResponse[];
  emrs: import('@/lib/queries/emr').EMRRecord[];
  loadingResponses: boolean;
  loadingEmrs: boolean;
  saveResponseMutation: ReturnType<typeof useSaveAnamnesisResponse>;
  filledByName?: string;
  filledBy?: string;
}

function ProntuarioTab({
  patientId,
  patientName,
  forms,
  responses,
  emrs,
  loadingResponses,
  loadingEmrs,
  saveResponseMutation,
  filledByName,
  filledBy,
}: ProntuarioTabProps) {
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string | number | boolean | string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hasRecords = responses.length > 0 || emrs.length > 0;

  const allRecords = useMemo(() => {
    const emrItems = emrs.map((emr) => ({
      type: 'emr' as const,
      id: `emr-${emr.id}`,
      date: emr.signedAt ? new Date(emr.signedAt as Date).getTime() : new Date(emr.createdAt as Date).getTime(),
      data: emr,
    }));
    const anamItems = responses.map((r) => ({
      type: 'anam' as const,
      id: `anam-${r.id}`,
      date: r.filledAt ? new Date(r.filledAt as Date).getTime() : 0,
      data: r,
    }));
    return [...emrItems, ...anamItems].sort((a, b) => b.date - a.date);
  }, [emrs, responses]);

  const selectedForm = selectedFormId ? forms.find((f) => f.id === selectedFormId) : null;

  const setAnswer = (fieldId: string, value: string | number | boolean | string[]) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSaveResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedForm) return;
    const requiredFields = (selectedForm.fields || []).filter((f) => f.required);
    for (const f of requiredFields) {
      const v = answers[f.id];
      if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
        setError(`Campo "${f.label}" é obrigatório`);
        return;
      }
    }
    try {
      await saveResponseMutation.mutateAsync({
        patientId,
        formId: selectedForm.id,
        formName: selectedForm.name,
        answers: { ...answers },
        filledBy,
        filledByName,
      });
      setSelectedFormId('');
      setAnswers({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  };

  const renderField = (field: AnamnesisFormField) => {
    const value = answers[field.id];
    const onChange = (v: string | number | boolean | string[]) => setAnswer(field.id, v);
    const baseClass = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900';
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClass}
            rows={3}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className={baseClass}
            required={field.required}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClass}
            required={field.required}
          />
        );
      case 'checkbox':
        const simNao = (value === true || value === 'Sim' ? 'Sim' : value === false || value === 'Não' ? 'Não' : '') as string;
        return (
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                checked={simNao === 'Sim'}
                onChange={() => onChange('Sim')}
                className="rounded-full border-neutral-300"
              />
              <span className="text-sm text-neutral-700">Sim</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                checked={simNao === 'Não'}
                onChange={() => onChange('Não')}
                className="rounded-full border-neutral-300"
              />
              <span className="text-sm text-neutral-700">Não</span>
            </label>
          </div>
        );
      case 'select':
        return (
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClass}
            required={field.required}
          >
            <option value="">Selecione...</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'multiselect':
        const arr = (Array.isArray(value) ? value : value ? [value] : []) as string[];
        return (
          <div className="space-y-2">
            {(field.options || []).map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={arr.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...arr, opt]);
                    else onChange(arr.filter((x) => x !== opt));
                  }}
                  className="rounded border-neutral-300"
                />
                <span className="text-sm text-neutral-700">{opt}</span>
              </label>
            ))}
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClass}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  if (loadingResponses || loadingEmrs) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-2">Preencher anamnese</h3>
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={selectedFormId}
              onChange={(e) => {
                setSelectedFormId(e.target.value);
                setAnswers({});
                setError(null);
              }}
              className="min-w-[200px] rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">Selecione um formulário</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Link
          href={`/tenant/admin/patients/${patientId}/emr?name=${encodeURIComponent(patientName)}`}
          className="self-end rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Preencher prontuário
        </Link>
      </div>

      {selectedForm && (
          <form onSubmit={handleSaveResponse} className="mt-4 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            {(selectedForm.fields || []).map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Salvar no prontuário
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFormId('');
                  setAnswers({});
                  setError(null);
                }}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          </form>
      )}

      <div>
        <h3 className="text-sm font-medium text-neutral-700 mb-2">Registros no prontuário</h3>
        {!hasRecords ? (
          <p className="text-neutral-500 text-sm">Nenhum registro de anamnese ou prontuário ainda.</p>
        ) : (
          <ul className="space-y-2">
            {allRecords.map((item) => {
              const isExpanded = expandedId === item.id;
              if (item.type === 'emr') {
                const emr = item.data;
                const signedAt = emr.signedAt ? format(new Date(emr.signedAt as Date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '';
                const p = emr.payload || {};
                return (
                  <li key={item.id} className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50"
                    >
                      <span className="font-medium text-neutral-900">Prontuário assinado</span>
                      <span className="text-sm text-neutral-500">{signedAt}</span>
                      <span className="text-neutral-400">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-neutral-200 px-4 py-3 bg-neutral-50 text-sm">
                        <dl className="space-y-2">
                          {p.patientComplaint && (
                            <div>
                              <dt className="text-neutral-500 font-medium">Queixa do paciente</dt>
                              <dd className="text-neutral-900 mt-0.5 whitespace-pre-wrap">{p.patientComplaint}</dd>
                            </div>
                          )}
                          {p.clinicalEvolution && (
                            <div>
                              <dt className="text-neutral-500 font-medium">Evolução clínica</dt>
                              <dd className="text-neutral-900 mt-0.5 whitespace-pre-wrap">{p.clinicalEvolution}</dd>
                            </div>
                          )}
                          {p.diagnosis && (
                            <div>
                              <dt className="text-neutral-500 font-medium">Diagnóstico</dt>
                              <dd className="text-neutral-900 mt-0.5 whitespace-pre-wrap">{p.diagnosis}</dd>
                            </div>
                          )}
                          {p.prescriptionNotes && (
                            <div>
                              <dt className="text-neutral-500 font-medium">Prescrição / Observações</dt>
                              <dd className="text-neutral-900 mt-0.5 whitespace-pre-wrap">{p.prescriptionNotes}</dd>
                            </div>
                          )}
                        </dl>
                        <div className="mt-3 pt-3 border-t border-neutral-200">
                          <button
                            type="button"
                            onClick={() =>
                              printEmr({
                                patientName,
                                payload: p,
                                signedAt: emr.signedAt,
                              })
                            }
                            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                          >
                            Imprimir / Salvar em PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              }
              const r = item.data;
              const filledAt = r.filledAt ? format(new Date(r.filledAt as Date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '';
              return (
                <li key={item.id} className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50"
                  >
                    <span className="font-medium text-neutral-900">{r.formName}</span>
                    <span className="text-sm text-neutral-500">
                      {filledAt}
                      {r.filledByName && ` · ${r.filledByName}`}
                    </span>
                    <span className="text-neutral-400">{isExpanded ? '▼' : '▶'}</span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-neutral-200 px-4 py-3 bg-neutral-50 text-sm">
                      <dl className="space-y-1">
                        {Object.entries(r.answers || {}).map(([fieldId, val]) => {
                          const form = forms.find((f) => f.id === r.formId);
                          const label = form?.fields?.find((f) => f.id === fieldId)?.label ?? fieldId;
                          const field = form?.fields?.find((f) => f.id === fieldId);
                          let displayVal: string;
                          if (Array.isArray(val)) {
                            displayVal = val.join(', ');
                          } else if (field?.type === 'checkbox' && typeof val === 'boolean') {
                            displayVal = val ? 'Sim' : 'Não';
                          } else {
                            displayVal = String(val);
                          }
                          return (
                            <div key={fieldId} className="flex gap-2">
                              <dt className="text-neutral-500 font-medium min-w-[120px]">{label}:</dt>
                              <dd className="text-neutral-900">{displayVal}</dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface CustomerDetailModalProps {
  customer: Customer;
  businessId: string;
  onClose: () => void;
  isClinic?: boolean;
}

export function CustomerDetailModal({ customer, businessId, onClose, isClinic = false }: CustomerDetailModalProps) {
  const { user } = useAuth();
  const { data: allBookings = [] } = useBookings(businessId);
  const updateCustomer = useUpdateCustomer(businessId);
  const { data: anamnesisForms = [] } = useAnamnesisForms(businessId);
  const { data: anamnesisResponses = [], isLoading: loadingResponses } = useAnamnesisResponsesForPatient(
    businessId,
    isClinic ? customer.id : null
  );
  const { data: emrs = [], isLoading: loadingEmrs } = useEmrsForPatient(
    businessId,
    isClinic ? customer.id : null
  );
  const saveResponse = useSaveAnamnesisResponse(businessId);

  const [activeTab, setActiveTab] = useState<'info' | 'records' | 'prontuario'>('info');
  const [formData, setFormData] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    email: customer.email || '',
    notes: customer.notes || '',
  });
  useEffect(() => {
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email || '',
      notes: customer.notes || '',
    });
  }, [customer.id, customer.firstName, customer.lastName, customer.phone, customer.email, customer.notes]);
  const [error, setError] = useState<string | null>(null);

  const customerPhoneNorm = normalizePhone(customer.phone);
  const customerBookings = useMemo(() => {
    return allBookings
      .filter((b) => {
        const bookingPhone = normalizePhone(b.customerData?.phone);
        const bookingEmail = (b.customerData?.email || '').toLowerCase().trim();
        const custEmail = (customer.email || '').toLowerCase().trim();
        return (
          (bookingPhone && bookingPhone === customerPhoneNorm) ||
          (custEmail && bookingEmail === custEmail)
        );
      })
      .sort((a, b) => {
        const aDate = a.scheduledDateTime instanceof Date ? a.scheduledDateTime : new Date(a.scheduledDateTime as any);
        const bDate = b.scheduledDateTime instanceof Date ? b.scheduledDateTime : new Date(b.scheduledDateTime as any);
        return bDate.getTime() - aDate.getTime();
      });
  }, [allBookings, customerPhoneNorm, customer.email]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      setError('Nome e telefone são obrigatórios');
      return;
    }
    try {
      await updateCustomer.mutateAsync({
        customerId: customer.id,
        updates: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        },
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    }
  };

  const money = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-neutral-900">
            {customer.firstName} {customer.lastName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-neutral-200">
          <div className="flex gap-1 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                activeTab === 'info'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Dados
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                activeTab === 'records'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Histórico ({customerBookings.length})
            </button>
            {isClinic && (
              <button
                type="button"
                onClick={() => setActiveTab('prontuario')}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === 'prontuario'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Prontuário ({anamnesisResponses.length})
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-6">
          {activeTab === 'info' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Sobrenome *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span>Agendamentos: {customer.totalBookings}</span>
                <span>Total gasto: {money(customer.totalSpent || 0)}</span>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={updateCustomer.isPending}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {updateCustomer.isPending ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  Fechar
                </button>
              </div>
            </form>
          )}

          {activeTab === 'prontuario' && isClinic && (
            <ProntuarioTab
              businessId={businessId}
              patientId={customer.id}
              patientName={`${customer.firstName} ${customer.lastName}`}
              forms={anamnesisForms}
              responses={anamnesisResponses}
              emrs={emrs}
              loadingResponses={loadingResponses}
              loadingEmrs={loadingEmrs}
              saveResponseMutation={saveResponse}
              filledByName={user?.displayName || user?.email || undefined}
              filledBy={user?.id}
            />
          )}

          {activeTab === 'records' && (
            <div className="space-y-3">
              {customerBookings.length === 0 ? (
                <p className="text-neutral-500 text-sm">Nenhum agendamento encontrado para este paciente.</p>
              ) : (
                <div className="space-y-2">
                  {customerBookings.map((booking) => {
                    const dt = booking.scheduledDateTime instanceof Date ? booking.scheduledDateTime : new Date(booking.scheduledDateTime as any);
                    return (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-neutral-900">{booking.serviceName}</p>
                          <p className="text-sm text-neutral-500">
                            {format(dt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {booking.professionalName && ` · ${booking.professionalName}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.status === 'completed' && 'Concluído'}
                            {booking.status === 'confirmed' && 'Confirmado'}
                            {booking.status === 'pending' && 'Pendente'}
                            {booking.status === 'cancelled' && 'Cancelado'}
                            {booking.status === 'no_show' && 'Não compareceu'}
                          </span>
                          <p className="mt-1 text-sm font-medium">{money(booking.price || 0)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
