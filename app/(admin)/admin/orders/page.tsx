'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { getAllOrders, getOrderDetail, updateOrderStatus, updateOrderTracking } from '@/lib/services/orders';
import { getUsersList } from '@/lib/services/admin';
import { createOrderDeliveryNote, listOrderDeliveryNotes, downloadDeliveryNotePdf, type DeliveryNote } from '@/lib/services/delivery-notes';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'En attente', color: 'bg-gray-100 text-gray-700' },
  { value: 'PROCESSING', label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'SHIPPED', label: 'Expédié', color: 'bg-blue-100 text-blue-700' },
  { value: 'DELIVERED', label: 'Livré', color: 'bg-green-100 text-green-700' },
  { value: 'DELIVERY_FAILED', label: 'Échec livraison', color: 'bg-orange-100 text-orange-700' },
  { value: 'CANCELLED', label: 'Annulé', color: 'bg-red-100 text-red-700' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Impayé', color: 'bg-gray-100 text-gray-700' },
  { value: 'PARTIALLY_PAID', label: 'Partiellement payé', color: 'bg-amber-100 text-amber-700' },
  { value: 'PAID', label: 'Payé', color: 'bg-green-100 text-green-700' },
  { value: 'FAILED', label: 'Échoué', color: 'bg-red-100 text-red-700' },
];

const DELIVERY_MODE_OPTIONS = [
  { value: 'INTERNAL', label: 'Livraison AGRIKIRI' },
  { value: 'EXTERNAL', label: 'Transporteur externe' },
];

function formatMoney(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('');
  const [deliveryAgentFilter, setDeliveryAgentFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [deliveryNoteDraft, setDeliveryNoteDraft] = useState<{
    deliveryAgentId: string;
    notes: string;
    lineQuantities: Record<string, string>;
  }>({
    deliveryAgentId: '',
    notes: '',
    lineQuantities: {},
  });
  const [trackingForm, setTrackingForm] = useState({
    deliveryMode: 'INTERNAL',
    deliveryAgentId: '',
    carrierName: '',
    deliveryAgentName: '',
    deliveryAgentPhone: '',
    deliveryZone: '',
    trackingNumber: '',
    estimatedDeliveryDate: '',
    eventTitle: '',
    eventDescription: '',
    eventStatus: 'PROCESSING',
    isCustomerVisible: true,
  });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['admin-orders', page, statusFilter, paymentStatusFilter, deliveryAgentFilter, searchTerm],
    queryFn: () => getAllOrders(page, 20, statusFilter, paymentStatusFilter || undefined, deliveryAgentFilter || undefined, searchTerm || undefined),
  });
  const { data: trackingOrder, isLoading: isTrackingLoading } = useQuery({
    queryKey: ['admin-order-detail', trackingOrderId],
    queryFn: () => getOrderDetail(trackingOrderId!),
    enabled: Boolean(trackingOrderId),
  });
  const { data: deliveryNotes = [], isLoading: isDeliveryNotesLoading } = useQuery({
    queryKey: ['order-delivery-notes', trackingOrderId],
    queryFn: () => listOrderDeliveryNotes(trackingOrderId!),
    enabled: Boolean(trackingOrderId),
  });
  const { data: deliveryAgentsData } = useQuery({
    queryKey: ['delivery-agents'],
    queryFn: () => getUsersList(1, 100, '', 'DELIVERY_AGENT'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, paymentStatus }: { id: string; status: string; paymentStatus?: string }) => 
      updateOrderStatus(id, status, paymentStatus),
    onSuccess: () => {
      toast.success('Statut de la commande mis à jour');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });
  const trackingMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateOrderTracking>[1] }) =>
      updateOrderTracking(id, payload),
    onSuccess: (updatedOrder) => {
      toast.success('Suivi logistique mis à jour');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.setQueryData(['admin-order-detail', updatedOrder.id], updatedOrder);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour du suivi');
    },
  });
  const createDeliveryNoteMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: Parameters<typeof createOrderDeliveryNote>[1] }) =>
      createOrderDeliveryNote(orderId, payload),
    onSuccess: () => {
      toast.success('Bon de livraison créé');
      queryClient.invalidateQueries({ queryKey: ['order-delivery-notes', trackingOrderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setDeliveryNoteDraft((current) => ({ ...current, notes: '', lineQuantities: {} }));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de créer ce bon de livraison');
    },
  });

  useEffect(() => {
    if (!trackingOrder) return;

    setTrackingForm({
      deliveryMode: trackingOrder.deliveryMode || 'INTERNAL',
      deliveryAgentId: trackingOrder.deliveryAgentId || '',
      carrierName: trackingOrder.carrierName || '',
      deliveryAgentName: trackingOrder.deliveryAgentName || '',
      deliveryAgentPhone: trackingOrder.deliveryAgentPhone || '',
      deliveryZone: trackingOrder.deliveryZone || '',
      trackingNumber: trackingOrder.trackingNumber || '',
      estimatedDeliveryDate: trackingOrder.estimatedDeliveryDate
        ? trackingOrder.estimatedDeliveryDate.slice(0, 10)
        : '',
      eventTitle: '',
      eventDescription: '',
      eventStatus: (trackingOrder.status || 'PROCESSING') as 'PROCESSING',
      isCustomerVisible: true,
    });
    setDeliveryNoteDraft({
      deliveryAgentId: trackingOrder.deliveryAgentId || '',
      notes: '',
      lineQuantities: Object.fromEntries((trackingOrder.orderItems || []).map((item) => [item.id, ''])),
    });
  }, [trackingOrder]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateMutation.mutate({ id: orderId, status: newStatus });
  };

  const handlePaymentStatusChange = (orderId: string, currentStatus: string, newPaymentStatus: string) => {
    updateMutation.mutate({ id: orderId, status: currentStatus, paymentStatus: newPaymentStatus });
  };

  const openTrackingPanel = (orderId: string) => {
    setTrackingOrderId(orderId);
  };

  const closeTrackingPanel = () => {
    setTrackingOrderId(null);
      setTrackingForm({
        deliveryMode: 'INTERNAL',
        deliveryAgentId: '',
        carrierName: '',
        deliveryAgentName: '',
        deliveryAgentPhone: '',
        deliveryZone: '',
        trackingNumber: '',
      estimatedDeliveryDate: '',
      eventTitle: '',
      eventDescription: '',
      eventStatus: 'PROCESSING',
      isCustomerVisible: true,
    });
  };

  const handleTrackingSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trackingOrderId) return;

    trackingMutation.mutate({
      id: trackingOrderId,
      payload: {
        deliveryMode: trackingForm.deliveryMode as 'INTERNAL' | 'EXTERNAL',
        deliveryAgentId: trackingForm.deliveryAgentId || null,
        carrierName: trackingForm.carrierName,
        deliveryAgentName: trackingForm.deliveryAgentName,
        deliveryAgentPhone: trackingForm.deliveryAgentPhone,
        deliveryZone: trackingForm.deliveryZone,
        trackingNumber: trackingForm.trackingNumber,
        estimatedDeliveryDate: trackingForm.estimatedDeliveryDate,
        eventTitle: trackingForm.eventTitle || undefined,
        eventDescription: trackingForm.eventDescription || undefined,
        eventStatus: trackingForm.eventStatus as any,
        isCustomerVisible: trackingForm.isCustomerVisible,
      },
    });
  };

  const handleCreateDeliveryNote = () => {
    if (!trackingOrderId || !trackingOrder) return;

    const preparedItems = (trackingOrder.orderItems || [])
      .map((item) => ({
        orderItemId: item.id,
        deliveredQuantity: Number(deliveryNoteDraft.lineQuantities[item.id] || 0),
      }))
      .filter((item) => item.deliveredQuantity > 0);

    if (preparedItems.length === 0) {
      toast.error('Indique au moins une quantité à livrer sur ce passage.');
      return;
    }

    createDeliveryNoteMutation.mutate({
      orderId: trackingOrderId,
      payload: {
        deliveryAgentId: deliveryNoteDraft.deliveryAgentId || null,
        notes: deliveryNoteDraft.notes.trim() || null,
        status: 'PREPARED',
        items: preparedItems,
      },
    });
  };

  const handleDownloadDeliveryNote = async (note: DeliveryNote) => {
    try {
      const blob = await downloadDeliveryNotePdf(note.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bon-livraison-${note.noteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible de télécharger ce bon.');
    }
  };

  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination;
  const deliveryAgents = deliveryAgentsData?.users || [];

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />

      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="font-display text-3xl text-agri-dark">Gestion des Commandes</h1>
            <p className="text-gray-500 mt-1">Suivi et mise à jour des commandes clients</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-agri-green-500 min-w-[220px]"
              placeholder="Commande, client ou email"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
            <select 
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-agri-green-500"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tous les statuts</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-agri-green-500"
              value={paymentStatusFilter}
              onChange={(e) => { setPaymentStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tous les paiements</option>
              {PAYMENT_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-agri-green-500"
              value={deliveryAgentFilter}
              onChange={(e) => { setDeliveryAgentFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tous les livreurs</option>
              {deliveryAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.firstName} {agent.lastName}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-agri-green-300 hover:text-agri-green-700"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setPaymentStatusFilter('');
                setDeliveryAgentFilter('');
                setPage(1);
              }}
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="card shadow-sm border border-gray-100 overflow-hidden">
          <div className="space-y-4 lg:hidden p-4">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="shimmer h-44 w-full rounded-2xl" />
              ))
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs font-bold text-gray-500 uppercase">
                        {order.orderNumber || `AGRO-${order.id.slice(0, 8)}`}
                      </div>
                      <div className="text-sm font-medium text-agri-dark mt-1">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </div>
                      <div className="text-xs text-gray-400">{order.customer?.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Date</div>
                      <div className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('fr-HT')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Montant</div>
                      <div className="font-bold text-agri-green-700">
                        {formatMoney(order.totalAmount)} HTG
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                          {order.deliveryMode === 'INTERNAL' ? 'Livraison AGRIKIRI' : 'Transporteur externe'}
                      </div>
                      {order.deliveryAgentName && (
                        <div className="mt-1 text-xs font-medium text-blue-600">
                          Livreur: {order.deliveryAgentName}
                        </div>
                      )}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => openTrackingPanel(order.id)}>
                      Suivi
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1 block">Paiement</span>
                      <select
                        className={`w-full text-xs font-bold px-3 py-2 rounded-xl border-none cursor-pointer outline-none ${
                          PAYMENT_STATUS_OPTIONS.find((o) => o.value === order.paymentStatus)?.color || 'bg-gray-100'
                        }`}
                        value={order.paymentStatus}
                        onChange={(e) => handlePaymentStatusChange(order.id, order.status, e.target.value)}
                      >
                        {PAYMENT_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1 block">Livraison</span>
                      <select
                        className={`w-full text-xs font-bold px-3 py-2 rounded-xl border-none cursor-pointer outline-none ${
                          STATUS_OPTIONS.find((o) => o.value === order.status)?.color || 'bg-gray-100'
                        }`}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400 italic">
                Aucune commande trouvée
              </div>
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="table-agri">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Client</th>
                  <th>Montant Total</th>
                  <th>Livreur</th>
                  <th>Paiement</th>
                  <th>Statut Livraison</th>
                  <th>Date</th>
                  <th>Suivi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={8}><div className="shimmer h-12 w-full rounded-lg" /></td></tr>
                  ))
                ) : orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="font-mono text-xs font-bold text-gray-500 uppercase">
                        {order.orderNumber || `AGRO-${order.id.slice(0, 8)}`}
                      </td>
                      <td>
                        <div className="font-medium text-agri-dark">
                          {order.customer?.firstName} {order.customer?.lastName}
                        </div>
                        <div className="text-xs text-gray-400">{order.customer?.email}</div>
                      </td>
                      <td className="font-bold text-agri-green-700">
                        {formatMoney(order.totalAmount)} HTG
                        <div className="mt-1 text-xs font-medium text-gray-400">
                          {order.deliveryMode === 'INTERNAL' ? 'Livraison AGRIKIRI' : 'Transporteur externe'}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm font-medium text-agri-dark">
                          {order.deliveryAgentName || (order.deliveryAgent ? `${order.deliveryAgent.firstName} ${order.deliveryAgent.lastName}` : 'Non assigné')}
                        </div>
                        {(order.deliveryAgentPhone || order.deliveryAgent?.phone) && (
                          <div className="text-xs text-gray-400">
                            {order.deliveryAgentPhone || order.deliveryAgent?.phone}
                          </div>
                        )}
                      </td>
                      <td>
                        <select 
                          className={`text-xs font-bold px-2 py-1 rounded-full border-none cursor-pointer outline-none ${
                            PAYMENT_STATUS_OPTIONS.find(o => o.value === order.paymentStatus)?.color || 'bg-gray-100'
                          }`}
                          value={order.paymentStatus}
                          onChange={(e) => handlePaymentStatusChange(order.id, order.status, e.target.value)}
                        >
                          {PAYMENT_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select 
                          className={`text-xs font-bold px-3 py-1 rounded-full border-none cursor-pointer outline-none ${
                            STATUS_OPTIONS.find(o => o.value === order.status)?.color || 'bg-gray-100'
                          }`}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="text-gray-400 text-sm">
                        {new Date(order.createdAt).toLocaleDateString('fr-HT')}
                      </td>
                      <td>
                        <Button variant="secondary" size="sm" onClick={() => openTrackingPanel(order.id)}>
                          Suivi
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400 italic">
                      Aucune commande trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex justify-center gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-500 font-medium">
                Page {page} sur {pagination.totalPages}
              </span>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Suivant
              </Button>
            </div>
          )}
        </div>
      </main>

      {trackingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-t-3xl lg:rounded-3xl bg-agri-cream shadow-2xl border border-white/60">
            <div className="sticky top-0 z-10 bg-agri-cream/95 backdrop-blur border-b border-gray-100 px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Suivi logistique</p>
                <h2 className="font-display text-3xl text-agri-dark">
                  {trackingOrder?.orderNumber || 'Chargement...'}
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  {trackingOrder?.customer?.firstName} {trackingOrder?.customer?.lastName}
                </p>
              </div>
              <button
                type="button"
                onClick={closeTrackingPanel}
                className="w-11 h-11 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-agri-dark"
              >
                ✕
              </button>
            </div>

            <div className="p-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <form onSubmit={handleTrackingSubmit} className="card p-6 border border-gray-100 space-y-5">
                <div>
                  <h3 className="font-display text-2xl text-agri-dark mb-2">Transport et suivi</h3>
                  <p className="text-sm text-gray-500">Mets à jour les informations de livraison et ajoute une étape visible pour le client si nécessaire.</p>
                </div>

                {isTrackingLoading || !trackingOrder ? (
                  <div className="shimmer h-80 w-full rounded-2xl" />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode de livraison</label>
                        <select
                          className="input"
                          value={trackingForm.deliveryMode}
                          onChange={(e) => setTrackingForm((current) => ({ ...current, deliveryMode: e.target.value }))}
                        >
                          {DELIVERY_MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Transporteur</label>
                        <input
                          className="input"
                          value={trackingForm.carrierName}
                          onChange={(e) => setTrackingForm((current) => ({ ...current, carrierName: e.target.value }))}
                          placeholder="Moto Express, transport interne..."
                        />
                      </div>
                    </div>

                    {trackingForm.deliveryMode === 'INTERNAL' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigner un livreur</label>
                          <select
                            className="input"
                            value={trackingForm.deliveryAgentId}
                            onChange={(e) => setTrackingForm((current) => ({ ...current, deliveryAgentId: e.target.value }))}
                          >
                            <option value="">Aucun livreur assigné</option>
                            {deliveryAgents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.firstName} {agent.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Livreur AGRIKIRI</label>
                          <input
                            className="input"
                            value={trackingForm.deliveryAgentName}
                            onChange={(e) => setTrackingForm((current) => ({ ...current, deliveryAgentName: e.target.value }))}
                            placeholder="Nom du livreur"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone du livreur</label>
                          <input
                            className="input"
                            value={trackingForm.deliveryAgentPhone}
                            onChange={(e) => setTrackingForm((current) => ({ ...current, deliveryAgentPhone: e.target.value }))}
                            placeholder="+509 37000000"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Zone de livraison</label>
                          <input
                            className="input"
                            value={trackingForm.deliveryZone}
                            onChange={(e) => setTrackingForm((current) => ({ ...current, deliveryZone: e.target.value }))}
                            placeholder="Port-au-Prince, Pétion-Ville..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trackingForm.deliveryMode === 'EXTERNAL' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro de suivi</label>
                          <input
                            className="input"
                            value={trackingForm.trackingNumber}
                            onChange={(e) => setTrackingForm((current) => ({ ...current, trackingNumber: e.target.value }))}
                            placeholder="TRK-2026-001"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Référence interne</label>
                          <input
                            className="input"
                            value={trackingForm.trackingNumber}
                            onChange={(e) => setTrackingForm((current) => ({ ...current, trackingNumber: e.target.value }))}
                            placeholder="Optionnel"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Livraison estimée</label>
                        <input
                          type="date"
                          className="input"
                          value={trackingForm.estimatedDeliveryDate}
                          onChange={(e) => setTrackingForm((current) => ({ ...current, estimatedDeliveryDate: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-5 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre de l’étape</label>
                        <input
                          className="input"
                          value={trackingForm.eventTitle}
                          onChange={(e) => setTrackingForm((current) => ({ ...current, eventTitle: e.target.value }))}
                          placeholder="Colis remis au livreur"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                        <textarea
                          className="input min-h-[120px]"
                          value={trackingForm.eventDescription}
                          onChange={(e) => setTrackingForm((current) => ({ ...current, eventDescription: e.target.value }))}
                          placeholder="Détails utiles pour le client ou l’équipe..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Statut associé</label>
                          <select
                            className="input"
                            value={trackingForm.eventStatus}
                            onChange={(e) => setTrackingForm((current) => ({ ...current, eventStatus: e.target.value }))}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <label className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={trackingForm.isCustomerVisible}
                            onChange={(e) => setTrackingForm((current) => ({ ...current, isCustomerVisible: e.target.checked }))}
                          />
                          <span className="text-sm text-gray-600">Visible pour le client</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button type="submit" variant="primary" loading={trackingMutation.isPending}>
                        Enregistrer le suivi
                      </Button>
                      <Button type="button" variant="secondary" onClick={closeTrackingPanel}>
                        Fermer
                      </Button>
                    </div>
                  </>
                )}
              </form>

              <div className="space-y-6">
                <div className="card p-6 border border-gray-100">
                  <h3 className="font-display text-2xl text-agri-dark mb-4">Bons de livraison</h3>
                  {trackingOrder ? (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-agri-green-100 bg-agri-green-50/40 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-[0.22em] text-agri-green-700 mb-2">Nouveau passage</div>
                            <p className="text-sm text-gray-600">
                              Prépare un bon fidèle au chargement réel. Tu peux livrer la commande en plusieurs passages.
                            </p>
                          </div>
                          <div className="w-full md:w-56">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Livreur du bon</label>
                            <select
                              className="input"
                              value={deliveryNoteDraft.deliveryAgentId}
                              onChange={(e) => setDeliveryNoteDraft((current) => ({ ...current, deliveryAgentId: e.target.value }))}
                            >
                              <option value="">Aucun livreur assigné</option>
                              {deliveryAgents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.firstName} {agent.lastName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/80 bg-white">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                              <tr>
                                <th className="px-4 py-3">Produit</th>
                                <th className="px-4 py-3">Commandé</th>
                                <th className="px-4 py-3">À livrer maintenant</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(trackingOrder.orderItems || []).map((item) => (
                                <tr key={item.id} className="border-t border-gray-100">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-agri-dark">{item.product.name}</div>
                                    {item.productVariant?.label ? (
                                      <div className="text-xs text-gray-400">{item.productVariant.label}</div>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-agri-dark">{item.quantity}</td>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      min={0}
                                      max={item.quantity}
                                      className="input max-w-[140px]"
                                      value={deliveryNoteDraft.lineQuantities[item.id] || ''}
                                      onChange={(e) =>
                                        setDeliveryNoteDraft((current) => ({
                                          ...current,
                                          lineQuantities: { ...current.lineQuantities, [item.id]: e.target.value },
                                        }))
                                      }
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes du bon</label>
                          <textarea
                            className="input min-h-[90px]"
                            value={deliveryNoteDraft.notes}
                            onChange={(e) => setDeliveryNoteDraft((current) => ({ ...current, notes: e.target.value }))}
                            placeholder="Ex: premier passage de 20 sacs, livraison partielle prévue..."
                          />
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button type="button" variant="primary" loading={createDeliveryNoteMutation.isPending} onClick={handleCreateDeliveryNote}>
                            Générer le bon
                          </Button>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-agri-dark mb-3">Historique des bons générés</div>
                        {isDeliveryNotesLoading ? (
                          <div className="shimmer h-36 w-full rounded-2xl" />
                        ) : deliveryNotes.length > 0 ? (
                          <div className="space-y-3">
                            {deliveryNotes.map((note) => (
                              <div key={note.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="text-xs uppercase tracking-[0.22em] text-gray-400">{note.noteNumber}</div>
                                    <div className="mt-1 font-semibold text-agri-dark">
                                      {note.totalQuantity} unités · {Number(note.totalWeightLbs).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Lbs
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {new Date(note.createdAt).toLocaleString('fr-FR')}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                      note.status === 'DELIVERED'
                                        ? 'bg-green-50 text-green-700'
                                        : note.status === 'IN_TRANSIT'
                                          ? 'bg-blue-50 text-blue-700'
                                          : note.status === 'CANCELLED'
                                            ? 'bg-red-50 text-red-700'
                                            : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      {note.status}
                                    </span>
                                    <Button type="button" variant="secondary" size="sm" onClick={() => handleDownloadDeliveryNote(note)}>
                                      PDF
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                            Aucun bon de livraison généré pour cette commande.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="shimmer h-80 w-full rounded-2xl" />
                  )}
                </div>

                <div className="card p-6 border border-gray-100">
                  <h3 className="font-display text-2xl text-agri-dark mb-4">Résumé commande</h3>
                  {trackingOrder ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white border border-gray-100 p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Paiement</div>
                        <div className="font-semibold text-agri-dark">{trackingOrder.paymentStatus}</div>
                      </div>
                      <div className="rounded-2xl bg-white border border-gray-100 p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Livraison</div>
                        <div className="font-semibold text-agri-dark">{trackingOrder.status}</div>
                      </div>
                      <div className="rounded-2xl bg-white border border-gray-100 p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Mode</div>
                        <div className="font-semibold text-agri-dark">
                          {trackingOrder.deliveryMode === 'INTERNAL' ? 'Livraison AGRIKIRI' : 'Transporteur externe'}
                        </div>
                      </div>
                      {trackingOrder.deliveryMode === 'INTERNAL' && (
                        <>
                          <div className="rounded-2xl bg-white border border-gray-100 p-4">
                            <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Livreur</div>
                            <div className="font-semibold text-agri-dark">{trackingOrder.deliveryAgentName || 'Non assigné'}</div>
                            {trackingOrder.deliveryAgentPhone && (
                              <div className="text-sm text-gray-500 mt-1">{trackingOrder.deliveryAgentPhone}</div>
                            )}
                          </div>
                          <div className="rounded-2xl bg-white border border-gray-100 p-4">
                            <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Zone</div>
                            <div className="font-semibold text-agri-dark">{trackingOrder.deliveryZone || 'Non définie'}</div>
                          </div>
                        </>
                      )}
                      <div className="rounded-2xl bg-white border border-gray-100 p-4 sm:col-span-2">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Adresse</div>
                        <div className="text-sm text-gray-600 leading-relaxed">
                          {trackingOrder.deliveryAddress?.fullName}<br />
                          {trackingOrder.deliveryAddress?.phoneCountryCode} {trackingOrder.deliveryAddress?.phoneNumber}<br />
                          {trackingOrder.deliveryAddress?.addressLine1}<br />
                          {trackingOrder.deliveryAddress?.addressLine2 && <>{trackingOrder.deliveryAddress?.addressLine2}<br /></>}
                          {trackingOrder.deliveryAddress?.city}, {trackingOrder.deliveryAddress?.stateRegion}<br />
                          {trackingOrder.deliveryAddress?.postalCode && <>{trackingOrder.deliveryAddress?.postalCode}<br /></>}
                          {trackingOrder.deliveryAddress?.countryCode}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="shimmer h-36 w-full rounded-2xl" />
                  )}
                </div>

                <div className="card p-6 border border-gray-100">
                  <h3 className="font-display text-2xl text-agri-dark mb-4">Timeline</h3>
                  {trackingOrder?.status === 'DELIVERED' && (
                    <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-white border border-gray-100 p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Destinataire</div>
                        <div className="font-semibold text-agri-dark">{trackingOrder.deliveryRecipientName || 'Non renseigné'}</div>
                        {trackingOrder.deliveryProofCapturedAt && (
                          <div className="text-sm text-gray-500 mt-2">
                            Capturé le {new Date(trackingOrder.deliveryProofCapturedAt).toLocaleString('fr-HT')}
                          </div>
                        )}
                        {trackingOrder.deliveryProofNote && (
                          <div className="mt-3 text-sm text-gray-600 leading-relaxed">{trackingOrder.deliveryProofNote}</div>
                        )}
                        {trackingOrder.deliveredLatitude != null && trackingOrder.deliveredLongitude != null && (
                          <div className="mt-3 text-sm text-gray-500">
                            Position : {trackingOrder.deliveredLatitude.toFixed(5)}, {trackingOrder.deliveredLongitude.toFixed(5)}
                            {trackingOrder.deliveredLocationAccuracy != null && (
                              <> · précision {Math.round(trackingOrder.deliveredLocationAccuracy)} m</>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {trackingOrder.deliveryProofPhotoUrl && (
                          <div className="rounded-2xl bg-white border border-gray-100 p-3">
                            <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Photo de livraison</div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={trackingOrder.deliveryProofPhotoUrl}
                              alt="Photo de livraison"
                              className="w-full rounded-2xl border border-gray-100 object-cover"
                            />
                          </div>
                        )}
                        {trackingOrder.deliverySignatureUrl && (
                          <div className="rounded-2xl bg-white border border-gray-100 p-3">
                            <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Signature</div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={trackingOrder.deliverySignatureUrl}
                              alt="Signature du destinataire"
                              className="w-full rounded-2xl border border-gray-100 bg-white object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {trackingOrder ? (
                    <div className="space-y-4">
                      {(trackingOrder.trackingEvents || []).length > 0 ? (
                        trackingOrder.trackingEvents!.map((event) => (
                          <div key={event.id} className="relative pl-6">
                            <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-agri-green-600" />
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-agri-dark">{event.title}</div>
                                  {event.description && <div className="text-sm text-gray-500 mt-1">{event.description}</div>}
                                </div>
                                <div className="text-xs text-gray-400 whitespace-nowrap">
                                  {new Date(event.createdAt).toLocaleString('fr-HT')}
                                </div>
                              </div>
                              <div className="mt-3 text-xs text-gray-400">
                                {event.status || 'INFO'} · {event.isCustomerVisible ? 'Visible client' : 'Interne'}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-400 italic">Aucun événement de tracking pour le moment.</div>
                      )}
                    </div>
                  ) : (
                    <div className="shimmer h-48 w-full rounded-2xl" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
