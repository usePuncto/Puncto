'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useOrders } from '@/lib/hooks/useOrders';
import { KitchenQueue } from '@/components/restaurant/KitchenQueue';
import { Order } from '@/types/restaurant';

export default function KitchenPage() {
  const { business } = useBusiness();
  const { orders, isLoading, updateItemStatus } = useOrders(business.id);

  const handleUpdateItemStatus = async (
    orderId: string,
    itemIndex: number,
    status: Order['items'][0]['status']
  ) => {
    try {
      await updateItemStatus(orderId, itemIndex, status);
    } catch (error) {
      console.error('Failed to update item status:', error);
      alert('Erro ao atualizar status do item');
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">Cozinha</h1>
        <p className="text-neutral-600 mt-2">Fila de pedidos para preparo</p>
      </div>

      <KitchenQueue
        orders={orders}
        onUpdateItemStatus={handleUpdateItemStatus}
      />
    </div>
  );
}
