import { useState, useEffect, useCallback } from 'react';
import { Order } from '@/types/restaurant';
import { useCentrifugo } from '@/components/providers/CentrifugoProvider';
import { getAuthHeaders } from '@/lib/auth/clientAuthHeaders';

export function useOrders(businessId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe, connected } = useCentrifugo();

  const loadOrders = useCallback(async () => {
    if (!businessId) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/orders?businessId=${businessId}`, { headers: await getAuthHeaders() });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadOrders();
    
    if (businessId && connected) {
      // Subscribe to order updates
      const channel = `org:${businessId}:orders`;
      const unsubscribe = subscribe(channel, (data: any) => {
        if (data.type === 'order_updated') {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === data.orderId ? { ...order, ...data.order } : order
            )
          );
        } else if (data.type === 'order_created') {
          setOrders((prev) => [...prev, data.order]);
        }
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [businessId, connected, subscribe, loadOrders]);


  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    if (!businessId) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          businessId,
          status,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update order status');
      }

      // Real-time update will handle the state update via Centrifugo
      // But we can also refresh to be safe
      await loadOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  };

  const updateItemStatus = async (
    orderId: string,
    itemIndex: number,
    status: Order['items'][0]['status']
  ) => {
    if (!businessId) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemIndex}/status`, {
        method: 'PUT',
        headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          businessId,
          status,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update item status');
      }

      // Real-time update will handle the state update via Centrifugo
      // But we can also refresh to be safe
      await loadOrders();
    } catch (error) {
      console.error('Failed to update item status:', error);
      throw error;
    }
  };

  return {
    orders,
    isLoading,
    updateOrderStatus,
    updateItemStatus,
    refresh: loadOrders,
  };
}
