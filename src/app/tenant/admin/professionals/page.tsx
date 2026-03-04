'use client';

import { useState } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useProfessionals, useCreateProfessional } from '@/lib/queries/professionals';

export default function AdminProfessionalsPage() {
  const { business } = useBusiness();
  const { data: professionals, isLoading } = useProfessionals(business.id);
  const createProfessional = useCreateProfessional(business.id);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    specialties: '',
    canBookOnline: true,
    active: true,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    try {
      await createProfessional.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        specialties: formData.specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        locationIds: [],
        active: formData.active,
        canBookOnline: formData.canBookOnline,
      });
      setShowForm(false);
      setFormData({ name: '', email: '', phone: '', bio: '', specialties: '', canBookOnline: true, active: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar profissional');
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
          <h1 className="text-3xl font-bold text-neutral-900">Profissionais</h1>
          <p className="text-neutral-600 mt-2">Gerencie sua equipe</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Cadastrar profissional
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Novo profissional</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="Nome completo"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="Breve descrição"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Especialidades</label>
              <input
                type="text"
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="Corte, Barba, Coloração (separadas por vírgula)"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.canBookOnline}
                  onChange={(e) => setFormData({ ...formData, canBookOnline: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <span className="text-sm text-neutral-700">Pode receber agendamentos online</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <span className="text-sm text-neutral-700">Ativo</span>
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createProfessional.isPending}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {createProfessional.isPending ? 'Salvando...' : 'Cadastrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {professionals?.map((professional) => (
          <div
            key={professional.id}
            className="rounded-lg border border-neutral-200 bg-white p-6"
          >
            {professional.avatarUrl && (
              <img
                src={professional.avatarUrl}
                alt={professional.name}
                className="h-16 w-16 rounded-full object-cover mx-auto mb-4"
              />
            )}
            <h3 className="text-lg font-semibold text-center">{professional.name}</h3>
            {professional.bio && (
              <p className="text-sm text-neutral-600 mt-2 text-center">{professional.bio}</p>
            )}
            {professional.specialties && professional.specialties.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {professional.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
            {professional.rating && (
              <div className="mt-4 text-center">
                <span className="text-sm text-neutral-600">
                  ⭐ {professional.rating.toFixed(1)} ({professional.totalReviews || 0} avaliações)
                </span>
              </div>
            )}
          </div>
        ))}

        {professionals?.length === 0 && (
          <div className="col-span-full p-8 text-center text-neutral-500">
            Nenhum profissional cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
