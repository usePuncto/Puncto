'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/contexts/BusinessContext';
import { PurchaseOrder } from '@/types/purchases';

export default function AdminPurchasesPage() {
  const { business } = useBusiness();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPOForm, setShowPOForm] = useState(false);
  const [poForm, setPoForm] = useState({
    supplierId: '',
    items: [{ name: '', quantity: '1', unit: 'unidade', unitCost: '' }],
  });
  const [poError, setPoError] = useState<string | null>(null);
  const [poLoading, setPoLoading] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [receivingPoId, setReceivingPoId] = useState<string | null>(null);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    loadPurchaseOrders();
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    fetch(`/api/suppliers?businessId=${business.id}`)
      .then((r) => r.json())
      .then((d) => setSuppliers(d.suppliers || []))
      .catch(() => setSuppliers([]));
  }, [business?.id]);

  const loadPurchaseOrders = async () => {
    if (!business?.id) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/purchases?businessId=${business.id}`);
      const data = await res.json();
      setPurchaseOrders(data.purchaseOrders || []);
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addPoItem = () => {
    setPoForm((f) => ({
      ...f,
      items: [...f.items, { name: '', quantity: '1', unit: 'unidade', unitCost: '' }],
    }));
  };

  const updatePoItem = (i: number, field: string, value: string) => {
    setPoForm((f) => ({
      ...f,
      items: f.items.map((item, idx) =>
        idx === i ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removePoItem = (i: number) => {
    setPoForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  };

  const resetPOForm = () => {
    setShowPOForm(false);
    setEditingPo(null);
    setPoForm({ supplierId: '', items: [{ name: '', quantity: '1', unit: 'unidade', unitCost: '' }] });
    setPoError(null);
  };

  const openEditForm = (po: PurchaseOrder) => {
    if (po.status !== 'draft') return;
    setEditingPo(po);
    setPoForm({
      supplierId: po.supplierId,
      items:
        po.items?.length > 0
          ? po.items.map((i) => ({
              name: i.name,
              quantity: String(i.quantity),
              unit: i.unit || 'unidade',
              unitCost: String(((i.unitCost ?? 0) / 100).toFixed(2)),
            }))
          : [{ name: '', quantity: '1', unit: 'unidade', unitCost: '' }],
    });
    setShowPOForm(true);
    setPoError(null);
  };

  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    setPoError(null);
    if (!poForm.supplierId) {
      setPoError('Selecione um fornecedor');
      return;
    }
    const items = poForm.items
      .filter((i) => i.name.trim() && i.quantity && i.unitCost)
      .map((i) => {
        const qty = parseFloat(i.quantity) || 0;
        const cost = parseFloat(i.unitCost) || 0;
        return { name: i.name.trim(), quantity: qty, unit: i.unit, unitCost: cost, total: qty * cost };
      });
    if (items.length === 0) {
      setPoError('Adicione ao menos um item');
      return;
    }
    setPoLoading(true);
    try {
      if (editingPo) {
        const res = await fetch(`/api/purchases/${editingPo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            updates: { supplierId: poForm.supplierId, status: 'draft', items },
          }),
        });
        if (!res.ok) throw new Error('Erro');
      } else {
        const res = await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            purchaseOrder: { supplierId: poForm.supplierId, status: 'draft', items },
          }),
        });
        if (!res.ok) throw new Error('Erro');
      }
      resetPOForm();
      loadPurchaseOrders();
    } catch {
      setPoError(editingPo ? 'Erro ao atualizar ordem' : 'Erro ao criar ordem de compra');
    } finally {
      setPoLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;
    setSupplierLoading(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, supplier: { name: supplierName.trim() } }),
      });
      if (!res.ok) throw new Error('Erro');
      const data = await res.json();
      setSuppliers((prev) => [...prev, { id: data.id, name: data.name }]);
      setShowSupplierForm(false);
      setSupplierName('');
    } finally {
      setSupplierLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-neutral-100 text-neutral-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const handleReceivePO = async (poId: string) => {
    if (!business?.id) return;
    setReceivingPoId(poId);
    try {
      const res = await fetch(`/api/purchases/${poId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao receber');
      }
      loadPurchaseOrders();
    } catch (err) {
      setPoError(err instanceof Error ? err.message : 'Erro ao receber ordem');
      setTimeout(() => setPoError(null), 5000);
    } finally {
      setReceivingPoId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'sent':
        return 'Enviado';
      case 'confirmed':
        return 'Confirmado';
      case 'received':
        return 'Recebido';
      case 'cancelled':
        return 'Cancelado';
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
          <h1 className="text-3xl font-bold text-neutral-900">Compras</h1>
          <p className="text-neutral-600 mt-2">Gerencie ordens de compra e fornecedores</p>
        </div>

        <button
          onClick={() => { setEditingPo(null); setShowPOForm(true); }}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          + Nova Ordem de Compra
        </button>
      </div>

      {showPOForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            {editingPo ? 'Editar ordem de compra' : 'Nova ordem de compra'}
          </h2>
          <form onSubmit={handleSubmitPO} className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 max-w-xs">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Fornecedor *</label>
                <select
                  value={poForm.supplierId}
                  onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecione...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierForm(true)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                + Novo fornecedor
              </button>
            </div>
            {showSupplierForm && (
              <div className="flex gap-2 p-4 bg-neutral-50 rounded-lg">
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Nome do fornecedor"
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <button type="button" onClick={handleCreateSupplier} disabled={supplierLoading} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
                  {supplierLoading ? '...' : 'Criar'}
                </button>
                <button type="button" onClick={() => { setShowSupplierForm(false); setSupplierName(''); }} className="rounded-lg border px-4 py-2 text-sm">
                  Cancelar
                </button>
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-neutral-700">Itens</label>
                <button type="button" onClick={addPoItem} className="text-sm text-blue-600 hover:underline">+ Adicionar item</button>
              </div>
              <div className="space-y-2">
                {poForm.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updatePoItem(i, 'name', e.target.value)}
                      placeholder="Nome"
                      className="col-span-3 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updatePoItem(i, 'quantity', e.target.value)}
                      className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updatePoItem(i, 'unit', e.target.value)}
                      className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    >
                      <option value="unidade">un</option>
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                      <option value="caixa">caixa</option>
                      <option value="pacote">pacote</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) => updatePoItem(i, 'unitCost', e.target.value)}
                      placeholder="Custo un."
                      className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={() => removePoItem(i)} className="col-span-1 text-red-600 text-sm">Remover</button>
                  </div>
                ))}
              </div>
            </div>
            {poError && <p className="text-sm text-red-600">{poError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={poLoading} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
                {poLoading ? 'Salvando...' : editingPo ? 'Salvar' : 'Criar ordem'}
              </button>
              <button type="button" onClick={resetPOForm} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">PO #</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Fornecedor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Total</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Data</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po, index) => (
              <tr key={po.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-900">
                  #{String(purchaseOrders.length - index).padStart(3, '0')}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600">
                  {suppliers.find((s) => s.id === po.supplierId)?.name ?? po.supplierId}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${getStatusColor(po.status)}`}>
                    {getStatusLabel(po.status)}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{formatPrice(po.total)}</td>
                <td className="px-4 py-3 text-sm text-neutral-600">
                  {new Date(po.createdAt as Date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {po.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => openEditForm(po)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Editar
                    </button>
                  )}
                  {po.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => handleReceivePO(po.id)}
                      disabled={receivingPoId === po.id}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {receivingPoId === po.id ? 'Recebendo...' : 'Receber'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {purchaseOrders.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            Nenhuma ordem de compra encontrada.
          </div>
        )}
      </div>
    </div>
  );
}
