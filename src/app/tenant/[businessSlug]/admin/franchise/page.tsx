'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface FranchiseUnit {
  id: string;
  displayName: string;
  slug: string;
  address?: any;
  active: boolean;
  rating?: number;
  reviewsCount?: number;
}

interface FranchiseMetrics {
  totalUnits: number;
  totalRevenue: number;
  totalBookings: number;
  averageRating: number;
}

interface FranchiseData {
  isFranchiseGroup: boolean;
  isFranchiseUnit: boolean;
  franchiseGroupId: string | null;
  units?: FranchiseUnit[];
  metrics?: FranchiseMetrics;
  group?: {
    id: string;
    displayName: string;
    slug: string;
  };
}

export default function FranchiseDashboardPage() {
  const { business } = useBusiness();
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnitId, setNewUnitId] = useState('');

  const { data: franchiseData, refetch } = useQuery<FranchiseData>({
    queryKey: ['franchise', business?.id],
    queryFn: async () => {
      if (!business?.id) return null;
      const response = await fetch(`/api/franchise?businessId=${business.id}`);
      if (!response.ok) throw new Error('Failed to fetch franchise data');
      return response.json();
    },
    enabled: !!business?.id,
  });

  const handleCreateGroup = async () => {
    if (!business?.id) return;
    try {
      const response = await fetch('/api/franchise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_group',
          businessId: business.id,
        }),
      });
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Error creating franchise group:', error);
    }
  };

  const handleAddUnit = async () => {
    if (!business?.id || !newUnitId) return;
    try {
      const response = await fetch('/api/franchise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_unit',
          businessId: business.id,
          franchiseGroupId: business.id,
          unitBusinessId: newUnitId,
        }),
      });
      if (response.ok) {
        setShowAddUnitModal(false);
        setNewUnitId('');
        refetch();
      }
    } catch (error) {
      console.error('Error adding unit:', error);
    }
  };

  const isFranchiseGroup = franchiseData?.isFranchiseGroup || business?.isFranchiseGroup || false;
  const isFranchiseUnit = franchiseData?.isFranchiseUnit || business?.franchiseGroupId ? true : false;

  if (!isFranchiseGroup && !isFranchiseUnit) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Franchise Management</h1>
        <p className="text-neutral-600 mt-2 mb-4">
          This business is not part of a franchise group. Create a franchise group to manage multiple units.
        </p>
        <button
          onClick={handleCreateGroup}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
        >
          Create Franchise Group
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Franchise Dashboard</h1>
          <p className="text-neutral-600 mt-2">
            {isFranchiseGroup ? 'Overview of all franchise units' : `Unit of ${franchiseData?.group?.displayName || 'Franchise Group'}`}
          </p>
        </div>
        {isFranchiseGroup && (
          <button
            onClick={() => setShowAddUnitModal(true)}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            Add Unit
          </button>
        )}
      </div>

      {isFranchiseGroup && franchiseData?.metrics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <p className="text-sm text-neutral-600">Total Units</p>
            <p className="text-3xl font-bold mt-2">{franchiseData.metrics.totalUnits}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <p className="text-sm text-neutral-600">Total Revenue</p>
            <p className="text-3xl font-bold mt-2">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(franchiseData.metrics.totalRevenue / 100)}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <p className="text-sm text-neutral-600">Total Bookings</p>
            <p className="text-3xl font-bold mt-2">{franchiseData.metrics.totalBookings}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <p className="text-sm text-neutral-600">Average Rating</p>
            <p className="text-3xl font-bold mt-2">{franchiseData.metrics.averageRating.toFixed(1)}</p>
          </div>
        </div>
      )}

      {isFranchiseGroup && franchiseData?.units && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Franchise Units</h2>
          <div className="space-y-4">
            {franchiseData.units.length === 0 ? (
              <p className="text-neutral-600">No units added yet. Click "Add Unit" to add your first franchise unit.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {franchiseData.units.map((unit) => (
                  <div key={unit.id} className="border border-neutral-200 rounded-lg p-4">
                    <h3 className="font-semibold text-neutral-900">{unit.displayName}</h3>
                    <p className="text-sm text-neutral-600 mt-1">{unit.slug}</p>
                    {unit.address && (
                      <p className="text-sm text-neutral-600 mt-1">
                        {unit.address.city}, {unit.address.state}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      {unit.rating && (
                        <span className="text-sm text-neutral-600">
                          ⭐ {unit.rating.toFixed(1)} ({unit.reviewsCount || 0})
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded ${unit.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {unit.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddUnitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add Franchise Unit</h2>
            <p className="text-neutral-600 mb-4">
              Enter the Business ID of the unit you want to add to this franchise group.
            </p>
            <input
              type="text"
              value={newUnitId}
              onChange={(e) => setNewUnitId(e.target.value)}
              placeholder="Business ID"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddUnitModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUnit}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
              >
                Add Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
