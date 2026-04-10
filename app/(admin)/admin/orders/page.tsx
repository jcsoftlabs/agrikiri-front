'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { getAllOrders, getOrderDetail, updateOrderStatus, updateOrderTracking } from '@/lib/services/orders';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'En attente', color: 'bg-gray-100 text-gray-700' },
  { value: 'PROCESSING', label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'SHIPPED', label: 'Expédié', color: 'bg-blue-100 text-blue-700' },
  { value: 'DELIVERED', label: 'Livré', color: 'bg-green-100 text-green-700' },
  { value: 'CANCELLED', label: 'Annulé', color: 'bg-red-100 text-red-700' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Impayé', color: 'bg-gray-100 text-gray-700' },
  { value: 'PAID', label: 'Payé', color: 'bg-green-100 text-green-700' },
  { value: 'FAILED', label: 'Échoué', color: 'bg-red-100 text-red-700' },
];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    carrierName: '',
    trackingNumber: '',
    estimatedDeliveryDate: '',
    eventTitle: '',
    eventDescription: '',
    eventStatus: 'PROCESSING',
    isCustomerVisible: true,
  });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['admin-orders', page, statusFilter],
    queryFn: () => getAllOrders(page, 20, statusFilter),
  });
  const { data: trackingOrder, isLoading: isTrackingLoading } = useQuery({
    queryKey: ['admin-order-detail', trackingOrderId],
    queryFn: () => getOrderDetail(trackingOrderId!),
    enabled: Boolean(trackingOrderId),
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

  useEffect(() => {
    if (!trackingOrder) return;

    setTrackingForm({
      carrierName: trackingOrder.carrierName || '',
      trackingNumber: trackingOrder.trackingNumber || '',
      estimatedDeliveryDate: trackingOrder.estimatedDeliveryDate
        ? trackingOrder.estimatedDeliveryDate.slice(0, 10)
        : '',
      eventTitle: '',
      eventDescription: '',
      eventStatus: (trackingOrder.status || 'PROCESSING') as 'PROCESSING',
      isCustomerVisible: true,
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
      carrierName: '',
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
        carrierName: trackingForm.carrierName,
        trackingNumber: trackingForm.trackingNumber,
        estimatedDeliveryDate: trackingForm.estimatedDeliveryDate,
        eventTitle: trackingForm.eventTitle || undefined,
        eventDescription: trackingForm.eventDescription || undefined,
        eventStatus: trackingForm.eventStatus as any,
        isCustomerVisible: trackingForm.isCustomerVisible,
      },
    });
  };

  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination;

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />

      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="font-display text-3xl text-agri-dark">Gestion des Commandes</h1>
            <p className="text-gray-500 mt-1">Suivi et mise à jour des commandes clients</p>
          </div>
          
          <div className="flex gap-2">
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
                        {order.totalAmount.toLocaleString()} HTG
                      </div>
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
                  <th>Paiement</th>
                  <th>Statut Livraison</th>
                  <th>Date</th>
                  <th>Suivi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7}><div className="shimmer h-12 w-full rounded-lg" /></td></tr>
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
                        {order.totalAmount.toLocaleString()} HTG
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
                    <td colSpan={7} className="text-center py-12 text-gray-400 italic">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Transporteur</label>
                        <input
                          className="input"
                          value={trackingForm.carrierName}
                          onChange={(e) => setTrackingForm((current) => ({ ...current, carrierName: e.target.value }))}
                          placeholder="Moto Express, transport interne..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro de suivi</label>
                        <input
                          className="input"
                          value={trackingForm.trackingNumber}
                          onChange={(e) => setTrackingForm((current) => ({ ...current, trackingNumber: e.target.value }))}
                          placeholder="TRK-2026-001"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Livraison estimée</label>
                      <input
                        type="date"
                        className="input"
                        value={trackingForm.estimatedDeliveryDate}
                        onChange={(e) => setTrackingForm((current) => ({ ...current, estimatedDeliveryDate: e.target.value }))}
                      />
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
