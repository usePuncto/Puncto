'use client';

import { useState } from 'react';
import {
  useAnamnesisForms,
  useCreateAnamnesisForm,
  useUpdateAnamnesisForm,
  useDeleteAnamnesisForm,
} from '@/lib/queries/anamnesis';
import type { AnamnesisForm as AnamnesisFormType, AnamnesisFormField } from '@/types/anamnesis';

const FIELD_TYPES: { value: AnamnesisFormField['type']; label: string }[] = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Seleção única' },
  { value: 'multiselect', label: 'Múltipla escolha' },
  { value: 'checkbox', label: 'Sim/Não' },
];

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

interface AnamnesisFormsSectionProps {
  businessId: string;
}

export function AnamnesisFormsSection({ businessId }: AnamnesisFormsSectionProps) {
  const { data: forms = [], isLoading } = useAnamnesisForms(businessId);
  const createForm = useCreateAnamnesisForm(businessId);
  const updateForm = useUpdateAnamnesisForm(businessId);
  const deleteForm = useDeleteAnamnesisForm(businessId);

  const [showEditor, setShowEditor] = useState(false);
  const [editingForm, setEditingForm] = useState<AnamnesisFormType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<AnamnesisFormField[]>([]);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setEditingForm(null);
    setName('');
    setDescription('');
    setFields([]);
    setError(null);
    setShowEditor(true);
  };

  const openEdit = (form: AnamnesisFormType) => {
    setEditingForm(form);
    setName(form.name);
    setDescription(form.description || '');
    setFields(form.fields.length ? [...form.fields] : []);
    setError(null);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingForm(null);
    setName('');
    setDescription('');
    setFields([]);
    setError(null);
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { id: generateId(), label: '', type: 'text', required: false },
    ]);
  };

  const updateField = (id: string, updates: Partial<AnamnesisFormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Nome do formulário é obrigatório');
      return;
    }
    const validFields = fields
      .map((f) => ({ ...f, label: f.label.trim() }))
      .filter((f) => f.label);
    if (validFields.some((f) => f.required && !f.label)) {
      setError('Campos obrigatórios precisam de um rótulo');
      return;
    }
    try {
      if (editingForm) {
        await updateForm.mutateAsync({
          formId: editingForm.id,
          updates: { name: trimmedName, description: description.trim() || undefined, fields: validFields },
        });
      } else {
        await createForm.mutateAsync({
          name: trimmedName,
          description: description.trim() || undefined,
          fields: validFields,
        });
      }
      closeEditor();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar formulário');
    }
  };

  const handleDelete = async (form: AnamnesisFormType) => {
    if (!confirm(`Excluir o formulário "${form.name}"?`)) return;
    try {
      await deleteForm.mutateAsync(form.id);
      if (editingForm?.id === form.id) closeEditor();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-neutral-600">
          Crie formulários de anamnese e preencha as respostas no prontuário de cada paciente.
        </p>
        <button
          type="button"
          onClick={openNew}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Novo formulário
        </button>
      </div>

      {showEditor && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            {editingForm ? 'Editar formulário' : 'Novo formulário de anamnese'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nome do formulário *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="Ex: Anamnese inicial"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Descrição (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="Breve descrição do formulário"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-neutral-700">Campos</label>
                <button
                  type="button"
                  onClick={addField}
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  + Adicionar campo
                </button>
              </div>
              <div className="space-y-3">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex flex-wrap items-start gap-2 rounded-lg border border-neutral-200 p-3 bg-neutral-50"
                  >
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className="flex-1 min-w-[120px] rounded border border-neutral-300 px-2 py-1.5 text-sm"
                      placeholder="Rótulo do campo"
                    />
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, { type: e.target.value as AnamnesisFormField['type'] })
                      }
                      className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                    >
                      {FIELD_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        className="rounded border-neutral-300"
                      />
                      Obrigatório
                    </label>
                    {(field.type === 'select' || field.type === 'multiselect') && (
                      <input
                        type="text"
                        value={(field.options || []).join(', ')}
                        onChange={(e) =>
                          updateField(field.id, {
                            options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        className="flex-1 min-w-[180px] rounded border border-neutral-300 px-2 py-1.5 text-sm"
                        placeholder="Opções separadas por vírgula"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                      title="Remover campo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createForm.isPending || updateForm.isPending}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {createForm.isPending || updateForm.isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {forms.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            Nenhum formulário de anamnese. Clique em &quot;Novo formulário&quot; para criar.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {forms.map((form) => (
              <li
                key={form.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50"
              >
                <div>
                  <p className="font-medium text-neutral-900">{form.name}</p>
                  {form.description && (
                    <p className="text-sm text-neutral-500">{form.description}</p>
                  )}
                  <p className="text-xs text-neutral-400 mt-1">
                    {form.fields?.length ?? 0} campo(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(form)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(form)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
