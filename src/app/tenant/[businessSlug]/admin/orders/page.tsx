'use client';

import { useBusiness } from '@/lib/contexts/BusinessContext';
import { useOrders } from '@/lib/hooks/useOrders';
import { VirtualTab } from '@/components/restaurant/VirtualTab';
import { SplitPaymentModal } from '@/components/restaurant/SplitPaymentModal';
import { Order, SplitPayment } from '@/types/restaurant';
import { useState } from 'react';

export default function AdminOrdersPage() {
  const { business } = useBusiness();
  const { orders, isLoading, updateOrderStatus, updateItemStatus, refresh } = useOrders(business.id);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [view, setView] = useState<'all' | 'open' | 'paid'>('all');
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  const filteredOrders = orders.filter((order) => {
    if (view === 'all') return true;
    return order.status === view;
  });

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

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateOrderStatus(orderId, status);
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Erro ao atualizar status do pedido');
    }
  };

  const handleSplitPayment = async (splits: SplitPayment[]) => {
    if (!selectedOrder) return;

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          splits,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create split payments');
      }

      await refresh();
      setIsSplitModalOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Failed to split payment:', error);
      throw error;
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
          <h1 className="text-3xl font-bold text-neutral-900">Pedidos</h1>
          <p className="text-neutral-600 mt-2">Gerencie os pedidos do restaurante</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              view === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setView('open')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              view === 'open'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            Abertos
          </button>
          <button
            onClick={() => setView('paid')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              view === 'paid'
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            Pagos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {filteredOrders.map((order) => (
          <div key={order.id} className="relative">
            <VirtualTab
              order={order}
              view="waiter"
              onUpdateItemStatus={(itemIndex, status) =>
                handleUpdateItemStatus(order.id, itemIndex, status)
              }
              onUpdateOrderStatus={(status) =>
                handleUpdateOrderStatus(order.id, status)
              }
            />
            {order.status === 'open' && (
              <button
                onClick={() => {
                  setSelectedOrder(order);
                  setIsSplitModalOpen(true);
                }}
                className="mt-2 w-full rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                Dividir Pagamento
              </button>
            )}
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="col-span-full p-8 text-center text-neutral-500">
            Nenhum pedido encontrado.
          </div>
        )}
      </div>

      {selectedOrder && (
        <SplitPaymentModal
          order={selectedOrder}
          isOpen={isSplitModalOpen}
          onClose={() => {
            setIsSplitModalOpen(false);
            setSelectedOrder(null);
          }}
          onSplit={handleSplitPayment}
        />
      )}
    </div>
  );
}
