'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  bulkUpdateOrders,
  cancelOrderAsAdmin,
  exportOrdersCsv,
  getAdminOrdersSummary,
  getAllOrders,
  getOrderDetail,
  recordOrderCollection,
  sendOrderReminder,
  updateOrderAfterSales,
  updateOrderStatus,
  updateOrderTracking,
  type AdminOrdersFilters,
  type Order,
} from '@/lib/services/orders';
import { getUsersList } from '@/lib/services/admin';
import {
  createOrderDeliveryNote,
  downloadDeliveryNotePdf,
  listOrderDeliveryNotes,
  type DeliveryNote,
} from '@/lib/services/delivery-notes';

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

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Tous les moyens' },
  { value: 'MONCASH', label: 'MonCash' },
  { value: 'PLOPPLOP', label: 'PLOP PLOP' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT_BANCAIRE', label: 'Virement bancaire' },
  { value: 'NATCASH', label: 'NatCash' },
  { value: 'KASHPAW', label: 'Kashpaw' },
];

const DELIVERY_MODE_OPTIONS = [
  { value: '', label: 'Tous les modes' },
  { value: 'INTERNAL', label: 'Livraison AGRIKIRI' },
  { value: 'EXTERNAL', label: 'Transporteur externe' },
];

const CASH_STATE_OPTIONS = [
  { value: '', label: 'Tous les encaissements' },
  { value: 'OPEN_BALANCE', label: 'Avec solde ouvert' },
  { value: 'PARTIALLY_COLLECTED', label: 'Partiellement encaissées' },
  { value: 'NOT_RECONCILED', label: 'Cash à rapprocher' },
  { value: 'RECONCILED', label: 'Cash rapproché' },
];

const CANCELLATION_SOURCE_OPTIONS = [
  { value: '', label: 'Toutes les annulations' },
  { value: 'CUSTOMER', label: 'Annulées par client' },
  { value: 'ADMIN', label: 'Annulées par admin' },
  { value: 'SYSTEM', label: 'Annulées par système' },
];

const AFTER_SALES_OPTIONS = [
  { value: '', label: 'Tous les SAV' },
  { value: 'NONE', label: 'Sans SAV' },
  { value: 'RETURN_REQUESTED', label: 'Retour demandé' },
  { value: 'RETURN_APPROVED', label: 'Retour approuvé' },
  { value: 'RETURNED', label: 'Retour réceptionné' },
  { value: 'REFUND_PENDING', label: 'Remboursement en attente' },
  { value: 'REFUNDED', label: 'Remboursé' },
  { value: 'REDELIVERY_SCHEDULED', label: 'Relivraison planifiée' },
  { value: 'REDELIVERED', label: 'Relivré' },
];

const QUICK_VIEW_OPTIONS = [
  { value: '', label: 'Vue générale' },
  { value: 'CASH_TODAY', label: 'Cash du jour' },
  { value: 'DELAYED', label: 'Commandes en retard' },
  { value: 'DELIVERY_FAILURES', label: 'Échecs livraison' },
  { value: 'AFTER_SALES', label: 'SAV ouvert' },
];

const COLLECTION_METHOD_OPTIONS = PAYMENT_METHOD_OPTIONS.filter((option) => option.value);

function formatMoney(amount?: number | null) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return 'Non renseigné';
  return new Date(value).toLocaleString('fr-HT', withTime ? undefined : {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function paymentMethodLabel(method?: string | null) {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label || 'Non renseigné';
}

function statusBadgeClass(status?: string) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.color || 'bg-gray-100 text-gray-700';
}

function paymentBadgeClass(status?: string) {
  return PAYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.color || 'bg-gray-100 text-gray-700';
}

function InfoCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'green' | 'amber' | 'rose';
}) {
  const toneClass = {
    default: 'bg-white border-gray-100',
    green: 'bg-agri-green-50/40 border-agri-green-100',
    amber: 'bg-amber-50 border-amber-100',
    rose: 'bg-rose-50 border-rose-100',
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-[0.28em] text-gray-400">{label}</div>
      <div className="mt-3 text-2xl font-bold text-agri-dark">{value}</div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminOrdersFilters>({
    q: '',
    status: '',
    paymentStatus: '',
    paymentMethod: '',
    deliveryMode: '',
    afterSalesStatus: '',
    deliveryAgentId: '',
    cancellationSource: '',
    cashCollectionState: '',
    quickView: '',
    dateFrom: '',
    dateTo: '',
  });
  const [bulkDraft, setBulkDraft] = useState({
    status: '',
    paymentStatus: '',
    deliveryMode: '',
    deliveryAgentId: '',
    note: '',
  });
  const [collectionDraft, setCollectionDraft] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    note: '',
    collectedAt: '',
  });
  const [afterSalesDraft, setAfterSalesDraft] = useState({
    afterSalesStatus: 'NONE',
    note: '',
  });
  const [reminderDraft, setReminderDraft] = useState({
    reminderType: 'PAYMENT',
    message: '',
  });
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

  const normalizedFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [key, value || undefined])
      ) as AdminOrdersFilters,
    [filters]
  );

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['admin-orders', page, normalizedFilters],
    queryFn: () => getAllOrders(page, 20, normalizedFilters),
  });

  const { data: summary } = useQuery({
    queryKey: ['admin-orders-summary', normalizedFilters],
    queryFn: () => getAdminOrdersSummary(normalizedFilters),
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
    queryFn: () => getUsersList(1, 200, '', 'DELIVERY_AGENT'),
  });

  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination;
  const deliveryAgents = deliveryAgentsData?.users || [];
  const allOnPageSelected = orders.length > 0 && orders.every((order) => selectedOrderIds.includes(order.id));

  useEffect(() => {
    setSelectedOrderIds([]);
  }, [page, normalizedFilters]);

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
      estimatedDeliveryDate: trackingOrder.estimatedDeliveryDate ? trackingOrder.estimatedDeliveryDate.slice(0, 10) : '',
      eventTitle: '',
      eventDescription: '',
      eventStatus: trackingOrder.status || 'PROCESSING',
      isCustomerVisible: true,
    });
    setDeliveryNoteDraft({
      deliveryAgentId: trackingOrder.deliveryAgentId || '',
      notes: '',
      lineQuantities: Object.fromEntries((trackingOrder.orderItems || []).map((item) => [item.id, ''])),
    });
    setCollectionDraft({
      amount: trackingOrder.amountRemaining ? String(trackingOrder.amountRemaining) : '',
      method: trackingOrder.paymentMethod === 'MONCASH' ? 'MONCASH' : trackingOrder.paymentMethod === 'NATCASH' ? 'NATCASH' : 'CASH',
      reference: '',
      note: '',
      collectedAt: '',
    });
    setAfterSalesDraft({
      afterSalesStatus: trackingOrder.afterSalesStatus || 'NONE',
      note: trackingOrder.afterSalesNote || '',
    });
    setReminderDraft({
      reminderType:
        trackingOrder.status === 'DELIVERY_FAILED'
          ? 'DELIVERY_FAILURE'
          : trackingOrder.paymentStatus !== 'PAID'
            ? 'PAYMENT'
            : trackingOrder.afterSalesStatus && trackingOrder.afterSalesStatus !== 'NONE'
              ? 'AFTER_SALES'
              : 'SHIPPING',
      message: '',
    });
  }, [trackingOrder]);

  const refreshOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin-orders-summary'] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, status, paymentStatus }: { id: string; status: string; paymentStatus?: string }) =>
      updateOrderStatus(id, status, paymentStatus),
    onSuccess: () => {
      toast.success('Commande mise à jour');
      refreshOrders();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Échec de mise à jour');
    },
  });

  const trackingMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateOrderTracking>[1] }) =>
      updateOrderTracking(id, payload),
    onSuccess: (updatedOrder) => {
      toast.success('Suivi logistique mis à jour');
      refreshOrders();
      queryClient.setQueryData(['admin-order-detail', updatedOrder.id], updatedOrder);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de mettre à jour le suivi');
    },
  });

  const collectionMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: Parameters<typeof recordOrderCollection>[1] }) =>
      recordOrderCollection(orderId, payload),
    onSuccess: (updatedOrder) => {
      toast.success('Encaissement enregistré');
      refreshOrders();
      queryClient.setQueryData(['admin-order-detail', updatedOrder.id], updatedOrder);
      setCollectionDraft((current) => ({ ...current, reference: '', note: '', amount: updatedOrder.amountRemaining ? String(updatedOrder.amountRemaining) : '' }));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible d’enregistrer cet encaissement');
    },
  });

  const afterSalesMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: Parameters<typeof updateOrderAfterSales>[1] }) =>
      updateOrderAfterSales(orderId, payload),
    onSuccess: (updatedOrder) => {
      toast.success('SAV mis à jour');
      refreshOrders();
      queryClient.setQueryData(['admin-order-detail', updatedOrder.id], updatedOrder);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de mettre à jour le SAV');
    },
  });

  const reminderMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: Parameters<typeof sendOrderReminder>[1] }) =>
      sendOrderReminder(orderId, payload),
    onSuccess: () => {
      toast.success('Relance envoyée');
      setReminderDraft((current) => ({ ...current, message: '' }));
      queryClient.invalidateQueries({ queryKey: ['admin-order-detail', trackingOrderId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible d’envoyer la relance');
    },
  });

  const bulkMutation = useMutation({
    mutationFn: bulkUpdateOrders,
    onSuccess: (result) => {
      toast.success(`${result.updatedCount} commande(s) mise(s) à jour`);
      setSelectedOrderIds([]);
      setBulkDraft({ status: '', paymentStatus: '', deliveryMode: '', deliveryAgentId: '', note: '' });
      refreshOrders();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Échec de la mise à jour groupée');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload?: { note?: string | null } }) =>
      cancelOrderAsAdmin(orderId, payload),
    onSuccess: (updatedOrder) => {
      toast.success('Commande annulée');
      refreshOrders();
      queryClient.setQueryData(['admin-order-detail', updatedOrder.id], updatedOrder);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible d’annuler cette commande');
    },
  });

  const createDeliveryNoteMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: Parameters<typeof createOrderDeliveryNote>[1] }) =>
      createOrderDeliveryNote(orderId, payload),
    onSuccess: () => {
      toast.success('Bon de livraison créé');
      queryClient.invalidateQueries({ queryKey: ['order-delivery-notes', trackingOrderId] });
      refreshOrders();
      setDeliveryNoteDraft((current) => ({ ...current, notes: '', lineQuantities: {} }));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de créer ce bon');
    },
  });

  const handleOrderSelection = (orderId: string, checked: boolean) => {
    setSelectedOrderIds((current) =>
      checked ? [...current, orderId] : current.filter((id) => id !== orderId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedOrderIds(checked ? orders.map((order) => order.id) : []);
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

  const handleCreateCollection = () => {
    if (!trackingOrderId) return;
    const amount = Number(collectionDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Indique un montant valide');
      return;
    }

    collectionMutation.mutate({
      orderId: trackingOrderId,
      payload: {
        amount,
        method: collectionDraft.method as any,
        reference: collectionDraft.reference || null,
        note: collectionDraft.note || null,
        collectedAt: collectionDraft.collectedAt || null,
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
      toast.error('Indique au moins une quantité à livrer');
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
      toast.error(error.response?.data?.message || 'Impossible de télécharger ce bon');
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await exportOrdersCsv(normalizedFilters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `commandes-admin-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Export impossible');
    }
  };

  const handleAfterSalesUpdate = () => {
    if (!trackingOrderId) return;
    afterSalesMutation.mutate({
      orderId: trackingOrderId,
      payload: {
        afterSalesStatus: afterSalesDraft.afterSalesStatus as any,
        note: afterSalesDraft.note || null,
      },
    });
  };

  const handleReminderSend = () => {
    if (!trackingOrderId) return;
    reminderMutation.mutate({
      orderId: trackingOrderId,
      payload: {
        reminderType: reminderDraft.reminderType as any,
        message: reminderDraft.message || null,
      },
    });
  };

  const handleAdminCancelOrder = () => {
    if (!trackingOrderId || !trackingOrder) return;
    const note = window.prompt(
      trackingOrder.amountCollected && trackingOrder.amountCollected > 0
        ? "Note d'annulation (optionnelle). Cette commande a déjà un encaissement et passera en suivi SAV / remboursement."
        : "Note d'annulation (optionnelle)."
    );

    if (note === null) return;

    const confirmed = window.confirm(
      trackingOrder.amountCollected && trackingOrder.amountCollected > 0
        ? "Confirmer l'annulation ? Le solde ouvert sera fermé, et la commande passera en suivi SAV / remboursement."
        : trackingOrder.status === 'SHIPPED' || trackingOrder.status === 'DELIVERED' || trackingOrder.status === 'DELIVERY_FAILED'
          ? "Confirmer l'annulation ? Le solde ouvert sera fermé, mais le stock ne sera pas réintégré automatiquement."
          : "Confirmer l'annulation ? Le solde ouvert sera fermé et le stock sera réintégré."
    );

    if (!confirmed) return;

    cancelOrderMutation.mutate({
      orderId: trackingOrderId,
      payload: { note: note.trim() || null },
    });
  };

  const handleBulkApply = () => {
    if (selectedOrderIds.length === 0) {
      toast.error('Sélectionne au moins une commande');
      return;
    }
    if (!bulkDraft.status && !bulkDraft.paymentStatus && !bulkDraft.deliveryMode && !bulkDraft.deliveryAgentId && !bulkDraft.note.trim()) {
      toast.error('Choisis au moins une action groupée');
      return;
    }

    bulkMutation.mutate({
      orderIds: selectedOrderIds,
      status: bulkDraft.status || undefined,
      paymentStatus: bulkDraft.paymentStatus || undefined,
      deliveryMode: (bulkDraft.deliveryMode || undefined) as 'INTERNAL' | 'EXTERNAL' | undefined,
      deliveryAgentId: bulkDraft.deliveryAgentId || undefined,
      note: bulkDraft.note.trim() || undefined,
    });
  };

  const resetFilters = () => {
    setFilters({
      q: '',
      status: '',
      paymentStatus: '',
      paymentMethod: '',
      deliveryMode: '',
      afterSalesStatus: '',
      deliveryAgentId: '',
      cancellationSource: '',
      cashCollectionState: '',
      quickView: '',
      dateFrom: '',
      dateTo: '',
    });
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />

      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-agri-green-700 mb-3">Pilotage commandes</p>
            <h1 className="font-display text-3xl lg:text-4xl text-agri-dark">Gestion des Commandes</h1>
            <p className="text-gray-500 mt-2 max-w-3xl">
              Vue opérationnelle complète: livraison, encaissement, annulations, relances et export.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleExportCsv}>Exporter CSV</Button>
            <Button variant="ghost" onClick={resetFilters}>Réinitialiser filtres</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <InfoCard label="Commandes filtrées" value={String(summary?.totalOrders || 0)} />
          <InfoCard label="Montant total" value={`${formatMoney(summary?.totalAmount)} HTG`} tone="green" />
          <InfoCard label="Encaissé" value={`${formatMoney(summary?.totalCollected)} HTG`} />
          <InfoCard label="Solde ouvert" value={`${formatMoney(summary?.totalOutstanding)} HTG`} tone="amber" />
          <InfoCard label="Cash à rapprocher" value={String(summary?.cashToReconcileCount || 0)} tone="amber" />
          <InfoCard label="Paiements partiels" value={String(summary?.partiallyCollectedCount || 0)} />
          <InfoCard label="Retards en attente" value={String(summary?.stalePendingCount || 0)} tone="rose" />
          <InfoCard label="Annulations client" value={String(summary?.customerCancelledCount || 0)} />
          <InfoCard label="Retards en traitement" value={String(summary?.staleProcessingCount || 0)} tone="rose" />
          <InfoCard label="Échecs à relancer" value={String(summary?.failedDeliveryFollowUpCount || 0)} tone="rose" />
          <InfoCard label="Livrées non soldées" value={String(summary?.deliveredUnpaidCount || 0)} tone="amber" />
          <InfoCard label="SAV ouvert" value={String(summary?.afterSalesOpenCount || 0)} />
        </div>

        <div className="card border border-gray-100 p-5 lg:p-6 mb-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select className="input" value={filters.quickView || ''} onChange={(e) => { setFilters((current) => ({ ...current, quickView: e.target.value })); setPage(1); }}>
              {QUICK_VIEW_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
            <input
              className="input xl:col-span-2"
              placeholder="Commande, client, email, téléphone, suivi"
              value={filters.q || ''}
              onChange={(e) => { setFilters((current) => ({ ...current, q: e.target.value })); setPage(1); }}
            />
            <select className="input" value={filters.status || ''} onChange={(e) => { setFilters((current) => ({ ...current, status: e.target.value })); setPage(1); }}>
              <option value="">Tous les statuts</option>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="input" value={filters.paymentStatus || ''} onChange={(e) => { setFilters((current) => ({ ...current, paymentStatus: e.target.value })); setPage(1); }}>
              <option value="">Tous les paiements</option>
              {PAYMENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="input" value={filters.paymentMethod || ''} onChange={(e) => { setFilters((current) => ({ ...current, paymentMethod: e.target.value })); setPage(1); }}>
              {PAYMENT_METHOD_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
            <select className="input" value={filters.deliveryMode || ''} onChange={(e) => { setFilters((current) => ({ ...current, deliveryMode: e.target.value })); setPage(1); }}>
              {DELIVERY_MODE_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
            <select className="input" value={filters.afterSalesStatus || ''} onChange={(e) => { setFilters((current) => ({ ...current, afterSalesStatus: e.target.value })); setPage(1); }}>
              {AFTER_SALES_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
            <select className="input" value={filters.deliveryAgentId || ''} onChange={(e) => { setFilters((current) => ({ ...current, deliveryAgentId: e.target.value })); setPage(1); }}>
              <option value="">Tous les livreurs</option>
              {deliveryAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.firstName} {agent.lastName}</option>)}
            </select>
            <select className="input" value={filters.cashCollectionState || ''} onChange={(e) => { setFilters((current) => ({ ...current, cashCollectionState: e.target.value })); setPage(1); }}>
              {CASH_STATE_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
            <select className="input" value={filters.cancellationSource || ''} onChange={(e) => { setFilters((current) => ({ ...current, cancellationSource: e.target.value })); setPage(1); }}>
              {CANCELLATION_SOURCE_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
            <input type="date" className="input" value={filters.dateFrom || ''} onChange={(e) => { setFilters((current) => ({ ...current, dateFrom: e.target.value })); setPage(1); }} />
            <input type="date" className="input" value={filters.dateTo || ''} onChange={(e) => { setFilters((current) => ({ ...current, dateTo: e.target.value })); setPage(1); }} />
          </div>
        </div>

        {selectedOrderIds.length > 0 && (
          <div className="card border border-agri-green-100 bg-agri-green-50/50 p-5 lg:p-6 mb-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-agri-green-700 mb-1">Action groupée</div>
                  <div className="text-lg font-semibold text-agri-dark">{selectedOrderIds.length} commande(s) sélectionnée(s)</div>
                </div>
                <Button variant="secondary" onClick={() => setSelectedOrderIds([])}>Vider la sélection</Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <select className="input" value={bulkDraft.status} onChange={(e) => setBulkDraft((current) => ({ ...current, status: e.target.value }))}>
                  <option value="">Statut livraison</option>
                  {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select className="input" value={bulkDraft.paymentStatus} onChange={(e) => setBulkDraft((current) => ({ ...current, paymentStatus: e.target.value }))}>
                  <option value="">Statut paiement</option>
                  {PAYMENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select className="input" value={bulkDraft.deliveryMode} onChange={(e) => setBulkDraft((current) => ({ ...current, deliveryMode: e.target.value }))}>
                  <option value="">Mode livraison</option>
                  {DELIVERY_MODE_OPTIONS.filter((option) => option.value).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select className="input" value={bulkDraft.deliveryAgentId} onChange={(e) => setBulkDraft((current) => ({ ...current, deliveryAgentId: e.target.value }))}>
                  <option value="">Assigner un livreur</option>
                  {deliveryAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.firstName} {agent.lastName}</option>)}
                </select>
                <input className="input" placeholder="Note interne optionnelle" value={bulkDraft.note} onChange={(e) => setBulkDraft((current) => ({ ...current, note: e.target.value }))} />
              </div>
              <div>
                <Button variant="primary" onClick={handleBulkApply} loading={bulkMutation.isPending}>Appliquer aux commandes sélectionnées</Button>
              </div>
            </div>
          </div>
        )}

        <div className="card border border-gray-100 overflow-hidden">
          <div className="hidden lg:block overflow-x-auto">
            <table className="table-agri">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allOnPageSelected} onChange={(e) => handleSelectAll(e.target.checked)} />
                  </th>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Montants</th>
                  <th>Paiement</th>
                  <th>Livraison</th>
                  <th>Alertes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, index) => (
                    <tr key={index}><td colSpan={8}><div className="shimmer h-14 w-full rounded-xl" /></td></tr>
                  ))
                ) : orders.length > 0 ? (
                  orders.map((order) => {
                    const remaining = Math.max(0, Number(order.amountRemaining || 0));
                    const isCashPending = order.paymentMethod === 'CASH' && order.status === 'DELIVERED' && !order.cashReconciledAt;
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50">
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={(e) => handleOrderSelection(order.id, e.target.checked)}
                          />
                        </td>
                        <td>
                          <div className="font-mono text-xs font-bold text-gray-500 uppercase">{order.orderNumber}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-400">Site e-commerce</div>
                          <div className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt)}</div>
                          {order.cancellationSource && (
                            <div className="mt-2 text-xs text-red-500">Annulation: {order.cancellationSource}</div>
                          )}
                        </td>
                        <td>
                          <div className="font-semibold text-agri-dark">{order.customer?.firstName} {order.customer?.lastName}</div>
                          <div className="text-xs text-gray-400">{order.customer?.email}</div>
                          {order.customer?.phone && <div className="text-xs text-gray-400">{order.customer.phone}</div>}
                        </td>
                        <td>
                          <div className="font-bold text-agri-green-700">{formatMoney(order.totalAmount)} HTG</div>
                          <div className="text-xs text-gray-500 mt-1">Encaissé: {formatMoney(order.amountCollected)} HTG</div>
                          <div className={`text-xs mt-1 ${remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>Reste: {formatMoney(remaining)} HTG</div>
                        </td>
                        <td>
                          <div className="text-sm font-medium text-agri-dark">{paymentMethodLabel(order.paymentMethod)}</div>
                          <select
                            className={`mt-2 text-xs font-bold px-3 py-2 rounded-full border-none cursor-pointer outline-none ${paymentBadgeClass(order.paymentStatus)}`}
                            value={order.paymentStatus}
                            onChange={(e) => updateMutation.mutate({ id: order.id, status: order.status, paymentStatus: e.target.value })}
                          >
                            {PAYMENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <div className="text-sm font-medium text-agri-dark">
                            {order.deliveryMode === 'INTERNAL' ? 'Livraison AGRIKIRI' : 'Transporteur externe'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{order.deliveryAgentName || (order.deliveryAgent ? `${order.deliveryAgent.firstName} ${order.deliveryAgent.lastName}` : 'Non assigné')}</div>
                          <select
                            className={`mt-2 text-xs font-bold px-3 py-2 rounded-full border-none cursor-pointer outline-none ${statusBadgeClass(order.status)}`}
                            value={order.status}
                            onChange={(e) => updateMutation.mutate({ id: order.id, status: e.target.value })}
                          >
                            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <div className="flex flex-col gap-2 text-xs">
                            {isCashPending && <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1 font-semibold">Cash à rapprocher</span>}
                            {remaining > 0 && <span className="rounded-full bg-rose-50 text-rose-700 px-3 py-1 font-semibold">Solde ouvert</span>}
                            {(order._count?.deliveryNotes || 0) > 0 && <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 font-semibold">{order._count?.deliveryNotes} bon(s)</span>}
                            {order.afterSalesStatus && order.afterSalesStatus !== 'NONE' && <span className="rounded-full bg-violet-50 text-violet-700 px-3 py-1 font-semibold">SAV {order.afterSalesStatus}</span>}
                          </div>
                        </td>
                        <td>
                          <Button variant="secondary" size="sm" onClick={() => setTrackingOrderId(order.id)}>Ouvrir</Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={8} className="py-14 text-center text-gray-400 italic">Aucune commande trouvée</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 p-4 lg:hidden">
            {isLoading ? (
              [...Array(4)].map((_, index) => <div key={index} className="shimmer h-44 rounded-3xl" />)
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const remaining = Math.max(0, Number(order.amountRemaining || 0));
                return (
                  <div key={order.id} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs font-bold text-gray-500 uppercase">{order.orderNumber}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-400">Site e-commerce</div>
                        <div className="mt-1 font-semibold text-agri-dark">{order.customer?.firstName} {order.customer?.lastName}</div>
                        <div className="text-xs text-gray-400">{formatDate(order.createdAt)}</div>
                      </div>
                      <input type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={(e) => handleOrderSelection(order.id, e.target.checked)} />
                    </div>
                    <div className="text-2xl font-bold text-agri-green-700">{formatMoney(order.totalAmount)} HTG</div>
                    <div className="text-sm text-gray-500">Encaissé {formatMoney(order.amountCollected)} HTG • Reste {formatMoney(remaining)} HTG</div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}>{order.status}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentBadgeClass(order.paymentStatus)}`}>{order.paymentStatus}</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setTrackingOrderId(order.id)}>Ouvrir le dossier</Button>
                  </div>
                );
              })
            ) : (
              <div className="py-14 text-center text-gray-400 italic">Aucune commande trouvée</div>
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-gray-100 p-4 flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Précédent</Button>
              <span className="px-3 text-sm text-gray-500">Page {page} / {pagination.totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page === pagination.totalPages} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}>Suivant</Button>
            </div>
          )}
        </div>
      </main>

      {trackingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
          <div className="w-full max-w-7xl max-h-[92vh] overflow-y-auto rounded-t-3xl lg:rounded-3xl bg-agri-cream shadow-2xl border border-white/60">
            <div className="sticky top-0 z-10 bg-agri-cream/95 backdrop-blur border-b border-gray-100 px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Dossier commande</p>
                <h2 className="font-display text-3xl text-agri-dark">{trackingOrder?.orderNumber || 'Chargement...'}</h2>
                <p className="text-sm text-gray-500 mt-2">{trackingOrder?.customer?.firstName} {trackingOrder?.customer?.lastName}</p>
              </div>
              <button type="button" onClick={() => setTrackingOrderId(null)} className="w-11 h-11 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-agri-dark">✕</button>
            </div>

            <div className="p-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="card border border-gray-100 p-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InfoCard label="Total" value={`${formatMoney(trackingOrder?.totalAmount)} HTG`} tone="green" />
                    <InfoCard label="Encaissé" value={`${formatMoney(trackingOrder?.amountCollected)} HTG`} />
                    <InfoCard label="Reste" value={`${formatMoney(trackingOrder?.amountRemaining)} HTG`} tone={Number(trackingOrder?.amountRemaining || 0) > 0 ? 'amber' : 'green'} />
                    <InfoCard label="Bons" value={String(trackingOrder?.deliveryNotes?.length || deliveryNotes.length || 0)} />
                  </div>
                  {trackingOrder && trackingOrder.status !== 'CANCELLED' && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button variant="danger" onClick={handleAdminCancelOrder} loading={cancelOrderMutation.isPending}>
                        Annuler la commande
                      </Button>
                      <div className="text-sm text-gray-500 self-center">
                        Sans encaissement: stock réintégré si la commande n’a pas quitté l’entrepôt. Avec encaissement: solde fermé et suivi SAV / remboursement.
                      </div>
                    </div>
                  )}
                </div>

                <div className="card border border-gray-100 p-6">
                  <h3 className="font-display text-2xl text-agri-dark mb-4">Produits et financiers</h3>
                  {isTrackingLoading || !trackingOrder ? (
                    <div className="shimmer h-52 rounded-3xl" />
                  ) : (
                    <div className="space-y-5">
                      <div className="overflow-x-auto rounded-3xl border border-gray-100 bg-white">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-[0.2em] text-gray-400">
                            <tr>
                              <th className="px-4 py-3">Produit</th>
                              <th className="px-4 py-3">Qté</th>
                              <th className="px-4 py-3">P.U.</th>
                              <th className="px-4 py-3">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(trackingOrder.orderItems || []).map((item) => (
                              <tr key={item.id} className="border-t border-gray-100">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-agri-dark">{item.product.name}</div>
                                  {item.productVariant?.label && <div className="text-xs text-gray-400">{item.productVariant.label}</div>}
                                </td>
                                <td className="px-4 py-3">{item.quantity}</td>
                                <td className="px-4 py-3">{formatMoney(item.price)} HTG</td>
                                <td className="px-4 py-3 font-semibold">{formatMoney(item.price * item.quantity)} HTG</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-gray-100 bg-white p-4"><div className="text-xs uppercase tracking-[0.22em] text-gray-400">Sous-total</div><div className="mt-2 font-semibold text-agri-dark">{formatMoney(trackingOrder.subtotalAmount)} HTG</div></div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4"><div className="text-xs uppercase tracking-[0.22em] text-gray-400">Livraison</div><div className="mt-2 font-semibold text-agri-dark">{formatMoney(trackingOrder.deliveryFee)} HTG</div></div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4"><div className="text-xs uppercase tracking-[0.22em] text-gray-400">Moyen</div><div className="mt-2 font-semibold text-agri-dark">{paymentMethodLabel(trackingOrder.paymentMethod)}</div></div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4"><div className="text-xs uppercase tracking-[0.22em] text-gray-400">AYIZAN</div><div className="mt-2 font-semibold text-agri-dark">{trackingOrder.ayizan ? `${trackingOrder.ayizan.firstName} ${trackingOrder.ayizan.lastName}` : 'Aucun'}</div></div>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleTrackingSubmit} className="card border border-gray-100 p-6 space-y-5">
                  <div>
                    <h3 className="font-display text-2xl text-agri-dark mb-2">Transport et suivi</h3>
                    <p className="text-sm text-gray-500">Assigne, ajuste et documente chaque étape visible ou interne.</p>
                  </div>
                  {isTrackingLoading || !trackingOrder ? (
                    <div className="shimmer h-72 rounded-3xl" />
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <select className="input" value={trackingForm.deliveryMode} onChange={(e) => setTrackingForm((current) => ({ ...current, deliveryMode: e.target.value }))}>
                          {DELIVERY_MODE_OPTIONS.filter((option) => option.value).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <input className="input" placeholder="Transporteur" value={trackingForm.carrierName} onChange={(e) => setTrackingForm((current) => ({ ...current, carrierName: e.target.value }))} />
                        <select className="input md:col-span-2" value={trackingForm.deliveryAgentId} onChange={(e) => setTrackingForm((current) => ({ ...current, deliveryAgentId: e.target.value }))}>
                          <option value="">Aucun livreur assigné</option>
                          {deliveryAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.firstName} {agent.lastName}</option>)}
                        </select>
                        <input className="input" placeholder="Nom livreur" value={trackingForm.deliveryAgentName} onChange={(e) => setTrackingForm((current) => ({ ...current, deliveryAgentName: e.target.value }))} />
                        <input className="input" placeholder="Téléphone livreur" value={trackingForm.deliveryAgentPhone} onChange={(e) => setTrackingForm((current) => ({ ...current, deliveryAgentPhone: e.target.value }))} />
                        <input className="input" placeholder="Zone de livraison" value={trackingForm.deliveryZone} onChange={(e) => setTrackingForm((current) => ({ ...current, deliveryZone: e.target.value }))} />
                        <input className="input" placeholder="Référence / tracking" value={trackingForm.trackingNumber} onChange={(e) => setTrackingForm((current) => ({ ...current, trackingNumber: e.target.value }))} />
                        <input type="date" className="input" value={trackingForm.estimatedDeliveryDate} onChange={(e) => setTrackingForm((current) => ({ ...current, estimatedDeliveryDate: e.target.value }))} />
                        <select className="input" value={trackingForm.eventStatus} onChange={(e) => setTrackingForm((current) => ({ ...current, eventStatus: e.target.value }))}>
                          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <input className="input md:col-span-2" placeholder="Titre de l’étape" value={trackingForm.eventTitle} onChange={(e) => setTrackingForm((current) => ({ ...current, eventTitle: e.target.value }))} />
                        <textarea className="input md:col-span-2 min-h-[110px]" placeholder="Description" value={trackingForm.eventDescription} onChange={(e) => setTrackingForm((current) => ({ ...current, eventDescription: e.target.value }))} />
                        <label className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3 md:col-span-2">
                          <input type="checkbox" checked={trackingForm.isCustomerVisible} onChange={(e) => setTrackingForm((current) => ({ ...current, isCustomerVisible: e.target.checked }))} />
                          <span className="text-sm text-gray-600">Visible pour le client</span>
                        </label>
                      </div>
                      <Button type="submit" variant="primary" loading={trackingMutation.isPending}>Enregistrer le suivi</Button>
                    </>
                  )}
                </form>
              </div>

              <div className="space-y-6">
                <div className="card border border-gray-100 p-6">
                  <h3 className="font-display text-2xl text-agri-dark mb-4">Encaissements</h3>
                  {trackingOrder ? (
                    <div className="space-y-5">
                      <div className="grid gap-3">
                        <input className="input" type="number" min="0" step="0.01" placeholder="Montant reçu" value={collectionDraft.amount} onChange={(e) => setCollectionDraft((current) => ({ ...current, amount: e.target.value }))} />
                        <select className="input" value={collectionDraft.method} onChange={(e) => setCollectionDraft((current) => ({ ...current, method: e.target.value }))}>
                          {COLLECTION_METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <input className="input" placeholder="Référence de paiement" value={collectionDraft.reference} onChange={(e) => setCollectionDraft((current) => ({ ...current, reference: e.target.value }))} />
                        <input className="input" type="datetime-local" value={collectionDraft.collectedAt} onChange={(e) => setCollectionDraft((current) => ({ ...current, collectedAt: e.target.value }))} />
                        <textarea className="input min-h-[90px]" placeholder="Note interne" value={collectionDraft.note} onChange={(e) => setCollectionDraft((current) => ({ ...current, note: e.target.value }))} />
                        <Button variant="primary" onClick={handleCreateCollection} loading={collectionMutation.isPending}>Enregistrer l’encaissement</Button>
                      </div>
                      <div className="space-y-3">
                        {(trackingOrder.paymentCollections || []).length > 0 ? (
                          (trackingOrder.paymentCollections || []).map((collection) => (
                            <div key={collection.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-agri-dark">{formatMoney(collection.amount)} HTG</div>
                                  <div className="text-xs text-gray-500 mt-1">{paymentMethodLabel(collection.method)} • {formatDate(collection.collectedAt, true)}</div>
                                  {collection.reference && <div className="text-xs text-gray-400 mt-1">Réf: {collection.reference}</div>}
                                  {collection.note && <div className="text-sm text-gray-600 mt-2">{collection.note}</div>}
                                </div>
                                <div className="text-right text-xs text-gray-400">
                                  {collection.collectedBy ? `${collection.collectedBy.firstName} ${collection.collectedBy.lastName}` : 'Admin'}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                            Aucun encaissement enregistré pour cette commande.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="shimmer h-52 rounded-3xl" />
                  )}
                </div>

                <div className="card border border-gray-100 p-6">
                  <h3 className="font-display text-2xl text-agri-dark mb-4">Bons de livraison</h3>
                  {trackingOrder ? (
                    <div className="space-y-4">
                      <select className="input" value={deliveryNoteDraft.deliveryAgentId} onChange={(e) => setDeliveryNoteDraft((current) => ({ ...current, deliveryAgentId: e.target.value }))}>
                        <option value="">Aucun livreur assigné</option>
                        {deliveryAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.firstName} {agent.lastName}</option>)}
                      </select>
                      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                            <tr><th className="px-4 py-3">Produit</th><th className="px-4 py-3">Commandé</th><th className="px-4 py-3">Ce passage</th></tr>
                          </thead>
                          <tbody>
                            {(trackingOrder.orderItems || []).map((item) => (
                              <tr key={item.id} className="border-t border-gray-100">
                                <td className="px-4 py-3">{item.product.name}{item.productVariant?.label ? <div className="text-xs text-gray-400">{item.productVariant.label}</div> : null}</td>
                                <td className="px-4 py-3">{item.quantity}</td>
                                <td className="px-4 py-3">
                                  <input type="number" min={0} max={item.quantity} className="input max-w-[120px]" value={deliveryNoteDraft.lineQuantities[item.id] || ''} onChange={(e) => setDeliveryNoteDraft((current) => ({ ...current, lineQuantities: { ...current.lineQuantities, [item.id]: e.target.value } }))} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <textarea className="input min-h-[90px]" placeholder="Notes du bon" value={deliveryNoteDraft.notes} onChange={(e) => setDeliveryNoteDraft((current) => ({ ...current, notes: e.target.value }))} />
                      <Button variant="primary" onClick={handleCreateDeliveryNote} loading={createDeliveryNoteMutation.isPending}>Générer le bon</Button>

                      <div className="space-y-3 pt-2">
                        {isDeliveryNotesLoading ? (
                          <div className="shimmer h-24 rounded-2xl" />
                        ) : deliveryNotes.length > 0 ? (
                          deliveryNotes.map((note) => (
                            <div key={note.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-xs uppercase tracking-[0.22em] text-gray-400">{note.noteNumber}</div>
                                  <div className="mt-1 font-semibold text-agri-dark">{note.totalQuantity} unités • {formatMoney(Number(note.totalWeightLbs))} Lbs</div>
                                  <div className="text-sm text-gray-500">{formatDate(note.createdAt, true)}</div>
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => handleDownloadDeliveryNote(note)}>PDF</Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                            Aucun bon généré pour cette commande.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="shimmer h-52 rounded-3xl" />
                  )}
                </div>

                <div className="card border border-gray-100 p-6">
                  <h3 className="font-display text-2xl text-agri-dark mb-4">SAV / Retours / Remboursements</h3>
                  {trackingOrder ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400">Statut actuel</div>
                        <div className="mt-2 font-semibold text-agri-dark">{trackingOrder.afterSalesStatus || 'NONE'}</div>
                        {trackingOrder.afterSalesUpdatedAt && <div className="text-xs text-gray-500 mt-2">Mis à jour le {formatDate(trackingOrder.afterSalesUpdatedAt, true)}</div>}
                      </div>
                      <select className="input" value={afterSalesDraft.afterSalesStatus} onChange={(e) => setAfterSalesDraft((current) => ({ ...current, afterSalesStatus: e.target.value }))}>
                        {AFTER_SALES_OPTIONS.filter((option) => option.value).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <textarea className="input min-h-[100px]" placeholder="Note SAV, retour, remboursement ou relivraison" value={afterSalesDraft.note} onChange={(e) => setAfterSalesDraft((current) => ({ ...current, note: e.target.value }))} />
                      <Button variant="primary" onClick={handleAfterSalesUpdate} loading={afterSalesMutation.isPending}>Mettre à jour le SAV</Button>
                    </div>
                  ) : (
                    <div className="shimmer h-40 rounded-3xl" />
                  )}
                </div>

                <div className="card border border-gray-100 p-6">
                  <h3 className="font-display text-2xl text-agri-dark mb-4">Relances client</h3>
                  {trackingOrder ? (
                    <div className="space-y-4">
                      <select className="input" value={reminderDraft.reminderType} onChange={(e) => setReminderDraft((current) => ({ ...current, reminderType: e.target.value }))}>
                        <option value="PAYMENT">Relance paiement</option>
                        <option value="SHIPPING">Relance expédition</option>
                        <option value="DELIVERY_FAILURE">Relance échec livraison</option>
                        <option value="AFTER_SALES">Relance SAV</option>
                        <option value="CUSTOM">Message personnalisé</option>
                      </select>
                      <textarea className="input min-h-[100px]" placeholder="Message optionnel. Si tu laisses vide, AGRIKIRI enverra un message standard intelligent." value={reminderDraft.message} onChange={(e) => setReminderDraft((current) => ({ ...current, message: e.target.value }))} />
                      <Button variant="secondary" onClick={handleReminderSend} loading={reminderMutation.isPending}>Envoyer la relance</Button>
                    </div>
                  ) : (
                    <div className="shimmer h-40 rounded-3xl" />
                  )}
                </div>

                <div className="card border border-gray-100 p-6">
                  <h3 className="font-display text-2xl text-agri-dark mb-4">Timeline et contexte</h3>
                  {trackingOrder ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-600 leading-relaxed">
                        {trackingOrder.deliveryAddress?.fullName}<br />
                        {trackingOrder.deliveryAddress?.phoneCountryCode} {trackingOrder.deliveryAddress?.phoneNumber}<br />
                        {trackingOrder.deliveryAddress?.addressLine1}<br />
                        {trackingOrder.deliveryAddress?.addressLine2 && <>{trackingOrder.deliveryAddress.addressLine2}<br /></>}
                        {trackingOrder.deliveryAddress?.city}, {trackingOrder.deliveryAddress?.stateRegion}
                      </div>
                      {(trackingOrder.trackingEvents || []).map((event) => (
                        <div key={event.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-agri-dark">{event.title}</div>
                              {event.description && <div className="text-sm text-gray-600 mt-1">{event.description}</div>}
                            </div>
                            <div className="text-xs text-gray-400">{formatDate(event.createdAt, true)}</div>
                          </div>
                        </div>
                      ))}
                      <div className="pt-3">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-3">Audit admin</div>
                        {(trackingOrder.auditLogs || []).length > 0 ? (
                          <div className="space-y-3">
                            {(trackingOrder.auditLogs || []).map((log) => (
                              <div key={log.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-semibold text-agri-dark">{log.title}</div>
                                    <div className="text-xs text-gray-400 mt-1">{log.actionType}</div>
                                    {log.description && <div className="text-sm text-gray-600 mt-2">{log.description}</div>}
                                    {log.actor && <div className="text-xs text-gray-500 mt-2">Par {log.actor.firstName} {log.actor.lastName} • {log.actor.role}</div>}
                                  </div>
                                  <div className="text-xs text-gray-400">{formatDate(log.createdAt, true)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                            Aucun audit admin pour cette commande.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="shimmer h-52 rounded-3xl" />
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
