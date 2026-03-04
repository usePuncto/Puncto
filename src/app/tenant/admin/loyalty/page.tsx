'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { LoyaltyProgram } from '@/types/crm';

export default function AdminLoyaltyPage() {
  const { business } = useBusiness();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgram | null>(null);
  const [programForm, setProgramForm] = useState({
    name: '',
    type: 'points' as 'points' | 'cashback' | 'tier',
    pointsPerReal: '1',
    cashbackPercent: '5',
    active: true,
  });
  const [programError, setProgramError] = useState<string | null>(null);
  const [programLoading, setProgramLoading] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, [business?.id]);

  const loadPrograms = async () => {
    if (!business?.id) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/loyalty/programs?businessId=${business.id}`);
      const data = await res.json();
      setPrograms(data.programs || []);
    } catch (error) {
      console.error('Failed to load loyalty programs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetProgramForm = () => {
    setShowProgramForm(false);
    setEditingProgram(null);
    setProgramForm({ name: '', type: 'points', pointsPerReal: '1', cashbackPercent: '5', active: true });
  };

  const openEditForm = (program: LoyaltyProgram) => {
    setEditingProgram(program);
    setProgramForm({
      name: program.name,
      type: program.type,
      pointsPerReal: String(program.rules?.pointsPerReal ?? 1),
      cashbackPercent: String(program.rules?.cashbackPercent ?? 5),
      active: program.active,
    });
    setShowProgramForm(true);
    setProgramError(null);
  };

  const handleSubmitProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setProgramError(null);
    if (!programForm.name.trim()) {
      setProgramError('Nome é obrigatório');
      return;
    }
    const rules: Record<string, number> = {};
    if (programForm.type === 'points') {
      rules.pointsPerReal = parseFloat(programForm.pointsPerReal) || 1;
    } else if (programForm.type === 'cashback') {
      rules.cashbackPercent = parseFloat(programForm.cashbackPercent) || 5;
    }
    setProgramLoading(true);
    try {
      if (editingProgram) {
        const res = await fetch(`/api/loyalty/programs/${editingProgram.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            updates: {
              name: programForm.name.trim(),
              type: programForm.type,
              rules,
              active: programForm.active,
            },
          }),
        });
        if (!res.ok) throw new Error('Erro');
      } else {
        const res = await fetch('/api/loyalty/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            program: {
              name: programForm.name.trim(),
              type: programForm.type,
              rules,
              active: programForm.active,
            },
          }),
        });
        if (!res.ok) throw new Error('Erro');
      }
      resetProgramForm();
      loadPrograms();
    } catch {
      setProgramError(editingProgram ? 'Erro ao atualizar programa' : 'Erro ao criar programa');
    } finally {
      setProgramLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Programa de Fidelidade</h1>
          <p className="text-neutral-600 mt-2">Gerencie programas de pontos e cashback</p>
        </div>

        <button
          onClick={() => { setEditingProgram(null); setShowProgramForm(true); }}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          + Novo Programa
        </button>
      </div>

      {showProgramForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            {editingProgram ? 'Editar programa de fidelidade' : 'Novo programa de fidelidade'}
          </h2>
          <form onSubmit={handleSubmitProgram} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nome *</label>
              <input
                type="text"
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Ex: Pontos Fidelidade"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo</label>
              <select
                value={programForm.type}
                onChange={(e) => setProgramForm({ ...programForm, type: e.target.value as 'points' | 'cashback' | 'tier' })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="points">Pontos</option>
                <option value="cashback">Cashback</option>
                <option value="tier">Tiers</option>
              </select>
            </div>
            {programForm.type === 'points' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Pontos por R$ 1,00</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={programForm.pointsPerReal}
                  onChange={(e) => setProgramForm({ ...programForm, pointsPerReal: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
            )}
            {programForm.type === 'cashback' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">% Cashback</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={programForm.cashbackPercent}
                  onChange={(e) => setProgramForm({ ...programForm, cashbackPercent: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
            )}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={programForm.active}
                onChange={(e) => setProgramForm({ ...programForm, active: e.target.checked })}
                className="rounded border-neutral-300"
              />
              <span className="text-sm text-neutral-700">Ativo</span>
            </label>
            {programError && <p className="text-sm text-red-600">{programError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={programLoading}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {programLoading ? 'Salvando...' : editingProgram ? 'Salvar' : 'Criar'}
              </button>
              <button
                type="button"
                onClick={resetProgramForm}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {programs.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <p className="text-neutral-500">Nenhum programa de fidelidade configurado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => (
            <div key={program.id} className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{program.name}</h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    Tipo: {program.type === 'points' && 'Pontos'}
                    {program.type === 'cashback' && 'Cashback'}
                    {program.type === 'tier' && 'Tiers'}
                  </p>
                  {program.rules?.pointsPerReal != null && (
                    <p className="text-sm text-neutral-600">
                      {program.rules.pointsPerReal} ponto(s) por R$ 1,00
                    </p>
                  )}
                  {program.rules?.cashbackPercent != null && (
                    <p className="text-sm text-neutral-600">
                      {program.rules.cashbackPercent}% cashback
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${
                    program.active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-800'
                  }`}>
                    {program.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditForm(program)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
