'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { Campaign } from '@/types/crm';

export default function AdminCampaignsPage() {
  const { business } = useBusiness();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, [business?.id]);

  const loadCampaigns = async () => {
    if (!business?.id) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/campaigns?businessId=${business.id}`);
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-neutral-100 text-neutral-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'sending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'scheduled':
        return 'Agendada';
      case 'sending':
        return 'Enviando';
      case 'sent':
        return 'Enviada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
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
          <h1 className="text-3xl font-bold text-neutral-900">Campanhas</h1>
          <p className="text-neutral-600 mt-2">Gerencie campanhas de marketing</p>
        </div>

        <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800">
          + Nova Campanha
        </button>
      </div>

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{campaign.name}</h3>
                <p className="text-sm text-neutral-600 mt-1">
                  Tipo: {campaign.type === 'email' && 'Email'}
                  {campaign.type === 'whatsapp' && 'WhatsApp'}
                  {campaign.type === 'sms' && 'SMS'}
                  {campaign.type === 'push' && 'Push'}
                </p>
                {campaign.stats && (
                  <div className="mt-2 flex gap-4 text-sm text-neutral-600">
                    <span>Enviados: {campaign.stats.sent}</span>
                    <span>Entregues: {campaign.stats.delivered}</span>
                    {campaign.stats.opened && (
                      <span>Abertos: {campaign.stats.opened}</span>
                    )}
                  </div>
                )}
              </div>
              <span className={`rounded px-2 py-1 text-xs font-medium ${getStatusColor(campaign.status)}`}>
                {getStatusLabel(campaign.status)}
              </span>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <p className="text-neutral-500">Nenhuma campanha criada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
