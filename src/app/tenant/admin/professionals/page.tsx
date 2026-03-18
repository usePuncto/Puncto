'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import {
  useProfessionals,
  useCreateProfessional,
  useUpdateProfessional,
  useDeleteProfessional,
} from '@/lib/queries/professionals';
import { Professional } from '@/types/business';

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  bio: '',
  specialties: '',
  avatarUrl: '',
  canBookOnline: true,
  active: true,
};

export default function AdminProfessionalsPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const { data: professionals, isLoading } = useProfessionals(business.id);
  const createProfessional = useCreateProfessional(business.id);
  const updateProfessional = useUpdateProfessional(business.id);
  const deleteProfessional = useDeleteProfessional(business.id);

  const [showForm, setShowForm] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedId, setInvitedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isOwnerProfessional = (pro: Professional) =>
    (pro as Professional & { isOwner?: boolean }).isOwner ||
    pro.userId === business?.createdBy ||
    pro.userId === user?.id;

  const handleDelete = async (pro: Professional) => {
    if (isOwnerProfessional(pro)) return;
    if (!confirm(`Excluir ${pro.name}? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(pro.id);
    try {
      await deleteProfessional.mutateAsync(pro.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setDeletingId(null);
    }
  };

  const handleInvite = async (pro: Professional) => {
    if (!pro.email?.trim()) {
      alert('Adicione um e-mail ao profissional antes de convidar.');
      return;
    }
    setInvitingId(pro.id);
    setInvitedId(null);
    try {
      const res = await fetch('/api/professionals/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          professionalId: pro.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar convite');
      setInvitedId(pro.id);
      queryClient.invalidateQueries({ queryKey: ['professionals', business.id] });
      if (data.resetLink && process.env.NODE_ENV === 'development') {
        console.log('Reset link (dev):', data.resetLink);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar convite');
    } finally {
      setInvitingId(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business?.id) return;
    setUploadError(null);
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/professionals/upload?businessId=${business.id}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha no upload');
      }
      const { url } = await res.json();
      setFormData((prev) => ({ ...prev, avatarUrl: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Falha no upload');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    try {
      if (editingProfessional) {
        await updateProfessional.mutateAsync({
          professionalId: editingProfessional.id,
          updates: {
            name: formData.name.trim(),
            email: formData.email.trim() || undefined,
            phone: formData.phone.trim() || undefined,
            bio: formData.bio.trim() || undefined,
            avatarUrl: formData.avatarUrl || undefined,
            specialties: formData.specialties
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            active: formData.active,
            canBookOnline: formData.canBookOnline,
          },
        });
      } else {
        await createProfessional.mutateAsync({
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          bio: formData.bio.trim() || undefined,
          avatarUrl: formData.avatarUrl || undefined,
          specialties: formData.specialties
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          locationIds: [],
          active: formData.active,
          canBookOnline: formData.canBookOnline,
        });
      }
      setShowForm(false);
      setEditingProfessional(null);
      setFormData(initialFormData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar profissional');
    }
  };

  const handleEdit = (professional: Professional) => {
    setEditingProfessional(professional);
    setFormData({
      name: professional.name,
      email: professional.email || '',
      phone: professional.phone || '',
      bio: professional.bio || '',
      specialties: (professional.specialties || []).join(', '),
      avatarUrl: professional.avatarUrl || '',
      canBookOnline: professional.canBookOnline ?? true,
      active: professional.active ?? true,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProfessional(null);
    setFormData(initialFormData);
    setError(null);
    setUploadError(null);
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
        {!showForm && (
          <button
            onClick={() => {
              setEditingProfessional(null);
              setFormData(initialFormData);
              setShowForm(true);
            }}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Cadastrar profissional
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            {editingProfessional ? 'Editar profissional' : 'Novo profissional'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Foto</label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-200">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-neutral-400 text-2xl">?</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="block w-full text-xs text-neutral-700 disabled:opacity-50"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    {uploadingPhoto ? 'Enviando...' : 'JPEG, PNG, GIF ou WebP. Máx. 2MB'}
                  </p>
                  {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
                </div>
              </div>
            </div>
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Especialidades
              </label>
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
                  onChange={(e) =>
                    setFormData({ ...formData, canBookOnline: e.target.checked })
                  }
                  className="rounded border-neutral-300"
                />
                <span className="text-sm text-neutral-700">
                  Pode receber agendamentos online
                </span>
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
                disabled={
                  createProfessional.isPending || updateProfessional.isPending
                }
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {createProfessional.isPending || updateProfessional.isPending
                  ? 'Salvando...'
                  : editingProfessional
                    ? 'Salvar alterações'
                    : 'Cadastrar'}
              </button>
              <button
                type="button"
                onClick={handleCloseForm}
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
            <div className="flex flex-col items-center">
              {professional.avatarUrl ? (
                <img
                  src={professional.avatarUrl}
                  alt={professional.name}
                  className="h-20 w-20 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <span className="text-neutral-400 text-2xl font-medium">
                    {professional.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <h3 className="text-lg font-semibold text-center">{professional.name}</h3>
              {isOwnerProfessional(professional) ? (
                <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Proprietário
                </span>
              ) : null}
            </div>
            {professional.bio && (
              <p className="text-sm text-neutral-600 mt-2 text-center line-clamp-2">
                {professional.bio}
              </p>
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
                  ⭐ {professional.rating.toFixed(1)} (
                  {professional.totalReviews || 0} avaliações)
                </span>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => handleEdit(professional)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Editar
              </button>
              {professional.email && !isOwnerProfessional(professional) && (
                <button
                  onClick={() => handleInvite(professional)}
                  disabled={!!invitingId}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  title="Enviar convite para login"
                >
                  {invitingId === professional.id ? 'Enviando...' : 'Convidar'}
                </button>
              )}
              {!isOwnerProfessional(professional) && (
                <button
                  onClick={() => handleDelete(professional)}
                  disabled={!!deletingId}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  title="Excluir profissional"
                >
                  {deletingId === professional.id ? 'Excluindo...' : 'Excluir'}
                </button>
              )}
            </div>
            {invitedId === professional.id && (
              <p className="mt-2 text-xs text-green-600">Convite enviado para {professional.email}</p>
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
