'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import {
  assignOrderToDelivery,
  confirmBuyerStockShipment,
  createStockReport,
  downloadStockReportPdf,
  getStockDashboard,
  updateStockQuantity,
  type StockProductOption,
} from '@/lib/services/stock';
import {
  createOrderDeliveryNote,
  createPosSaleDeliveryNote,
  type CreateDeliveryNotePayload,
} from '@/lib/services/delivery-notes';

type DraftLine = {
  id: string;
  productId: string;
  productVariantId: string;
  quantity: string;
};

type DeliveryNoteLineDraft = {
  orderItemId: string;
  description: string;
  orderedQuantity: number;
  alreadyDeliveredQuantity: number;
  remainingQuantity: number;
  deliveredQuantity: string;
};

type PosDeliveryNoteLineDraft = {
  posSaleItemId: string;
  description: string;
  orderedQuantity: number;
  alreadyDeliveredQuantity: number;
  remainingQuantity: number;
  deliveredQuantity: string;
};

function createDraftLine(): DraftLine {
  return {
    id: Math.random().toString(36).slice(2, 10),
    productId: '',
    productVariantId: '',
    quantity: '',
  };
}

function formatWeight(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getApiErrorMessage(error: any, fallback: string) {
  const validationErrors = error?.response?.data?.errors;
  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    return validationErrors
      .map((entry: { field?: string; message?: string }) =>
        entry?.field ? `${entry.field}: ${entry.message || 'Valeur invalide'}` : entry?.message
      )
      .filter(Boolean)
      .join(' · ');
  }

  return error?.response?.data?.message || fallback;
}

async function triggerStockReportDownload(reportId: string, title: string) {
  const blob = await downloadStockReportPdf(reportId);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  link.href = url;
  link.download = `rapport-stock-${safeTitle || reportId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function buildPreview(lines: DraftLine[], products: StockProductOption[]) {
  return lines.reduce(
    (acc, line) => {
      const product = products.find((entry) => entry.id === line.productId);
      if (!product) return acc;
      const variant = product.variants.find((entry) => entry.id === line.productVariantId);
      const quantity = Number(line.quantity || 0);
      const unitWeightLbs = Number((variant ? variant.weightLbs : product.weightLbs) || 0);
      acc.totalQuantity += quantity;
      acc.totalWeightLbs += quantity * unitWeightLbs;
      return acc;
    },
    { totalQuantity: 0, totalWeightLbs: 0 }
  );
}

function aggregateShipmentItems(shipments: any[]) {
  const buckets = new Map<string, { description: string; quantity: number; lineWeightLbs: number }>();

  shipments.forEach((shipment) => {
    const items = Array.isArray(shipment.items) ? shipment.items : [];
    items.forEach((item: any) => {
      const key = `${item.productVariantId || item.productId || item.description}`;
      const current = buckets.get(key) || {
        description: item.description || 'Produit',
        quantity: 0,
        lineWeightLbs: 0,
      };

      current.quantity += Number(item.quantity || 0);
      current.lineWeightLbs += Number(item.lineWeightLbs || 0);
      buckets.set(key, current);
    });
  });

  const items = Array.from(buckets.values());
  return {
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalWeightLbs: items.reduce((sum, item) => sum + item.lineWeightLbs, 0),
  };
}

export default function StockManagerDashboard() {
  const queryClient = useQueryClient();
  const [stockForm, setStockForm] = useState({
    productId: '',
    productVariantId: '',
    stockQuantity: '',
  });
  const [assignmentForm, setAssignmentForm] = useState<Record<string, { deliveryAgentId: string; deliveryZone: string }>>({});
  const [openNoteOrderId, setOpenNoteOrderId] = useState<string | null>(null);
  const [openNotePosSaleId, setOpenNotePosSaleId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<
    Record<string, { deliveryAgentId: string; notes: string; items: DeliveryNoteLineDraft[] }>
  >({});
  const [posNoteDrafts, setPosNoteDrafts] = useState<
    Record<string, { deliveryAgentId: string; notes: string; items: PosDeliveryNoteLineDraft[] }>
  >({});
  const [reportForm, setReportForm] = useState({
    title: '',
    reportDate: new Date().toISOString().slice(0, 10),
    summary: '',
    buyerShipmentIds: [] as string[],
    stockOutputItems: [createDraftLine()],
    productionInputItems: [createDraftLine()],
    productionOrderOutputItems: [createDraftLine()],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['stock-dashboard'],
    queryFn: getStockDashboard,
  });

  const products = data?.products || [];
  const shipments = data?.shipments || [];
  const orders = data?.orders || [];
  const posSales = data?.posSales || [];
  const deliveryAgents = data?.deliveryAgents || [];
  const reports = data?.reports || [];
  const overview = data?.overview;

  const confirmShipmentMutation = useMutation({
    mutationFn: confirmBuyerStockShipment,
    onSuccess: () => {
      toast.success('Réception stock confirmée');
      queryClient.invalidateQueries({ queryKey: ['stock-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-stock-shipments'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de confirmer la réception'),
  });

  const updateStockMutation = useMutation({
    mutationFn: updateStockQuantity,
    onSuccess: () => {
      toast.success('Stock mis à jour');
      setStockForm({ productId: '', productVariantId: '', stockQuantity: '' });
      queryClient.invalidateQueries({ queryKey: ['stock-dashboard'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de mettre à jour le stock'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: { deliveryAgentId: string; deliveryZone?: string } }) =>
      assignOrderToDelivery(orderId, payload),
    onSuccess: () => {
      toast.success('Commande assignée au livreur');
      queryClient.invalidateQueries({ queryKey: ['stock-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-assignments'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible d’assigner cette commande'),
  });

  const createOrderNoteMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: CreateDeliveryNotePayload }) =>
      createOrderDeliveryNote(orderId, payload),
    onSuccess: () => {
      toast.success('Bon de livraison créé');
      queryClient.invalidateQueries({ queryKey: ['stock-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-notes-my'] });
      setOpenNoteOrderId(null);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de créer ce bon de livraison'),
  });

  const createPosNoteMutation = useMutation({
    mutationFn: ({ posSaleId, payload }: { posSaleId: string; payload: CreateDeliveryNotePayload }) =>
      createPosSaleDeliveryNote(posSaleId, payload),
    onSuccess: () => {
      toast.success('Bon de livraison POS créé');
      queryClient.invalidateQueries({ queryKey: ['stock-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-notes-my'] });
      setOpenNotePosSaleId(null);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de créer ce bon de livraison POS'),
  });

  const createReportMutation = useMutation({
    mutationFn: createStockReport,
    onSuccess: () => {
      toast.success('Rapport stock publié');
      setReportForm({
        title: '',
        reportDate: new Date().toISOString().slice(0, 10),
        summary: '',
        buyerShipmentIds: [],
        stockOutputItems: [createDraftLine()],
        productionInputItems: [createDraftLine()],
        productionOrderOutputItems: [createDraftLine()],
      });
      queryClient.invalidateQueries({ queryKey: ['stock-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stock-board-reports'] });
    },
    onError: (error: any) => toast.error(getApiErrorMessage(error, 'Impossible de publier ce rapport stock')),
  });

  const selectedStockProduct = products.find((entry) => entry.id === stockForm.productId);
  const selectedStockVariant = selectedStockProduct?.variants.find((entry) => entry.id === stockForm.productVariantId);

  const stockOutputPreview = useMemo(() => buildPreview(reportForm.stockOutputItems, products), [reportForm.stockOutputItems, products]);
  const productionInputPreview = useMemo(() => buildPreview(reportForm.productionInputItems, products), [reportForm.productionInputItems, products]);
  const productionOrderOutputPreview = useMemo(
    () => buildPreview(reportForm.productionOrderOutputItems, products),
    [reportForm.productionOrderOutputItems, products]
  );

  const receivedShipmentsAvailable = shipments.filter(
    (shipment) => shipment.status === 'RECEIVED' && !shipment.reportedInStockReportId
  ) as any[];
  const selectedBuyerReceiptsPreview = useMemo(
    () => aggregateShipmentItems(receivedShipmentsAvailable.filter((shipment) => reportForm.buyerShipmentIds.includes(shipment.id))),
    [receivedShipmentsAvailable, reportForm.buyerShipmentIds]
  );

  const updateDraftLine = (
    section: 'stockOutputItems' | 'productionInputItems' | 'productionOrderOutputItems',
    lineId: string,
    field: keyof DraftLine,
    value: string
  ) => {
    setReportForm((current) => ({
      ...current,
      [section]: current[section].map((line) => {
        if (line.id !== lineId) return line;
        if (field === 'productId') {
          return { ...line, productId: value, productVariantId: '', quantity: line.quantity };
        }
        return { ...line, [field]: value };
      }),
    }));
  };

  const addDraftLine = (section: 'stockOutputItems' | 'productionInputItems' | 'productionOrderOutputItems') => {
    setReportForm((current) => ({
      ...current,
      [section]: [...current[section], createDraftLine()],
    }));
  };

  const removeDraftLine = (section: 'stockOutputItems' | 'productionInputItems' | 'productionOrderOutputItems', lineId: string) => {
    setReportForm((current) => ({
      ...current,
      [section]: current[section].length > 1 ? current[section].filter((line) => line.id !== lineId) : [createDraftLine()],
    }));
  };

  const prepareReportLines = (lines: DraftLine[], sectionLabel: string) => {
    const activeLines = lines.filter(
      (line) => line.productId || line.productVariantId || line.quantity.trim()
    );

    for (let index = 0; index < activeLines.length; index += 1) {
      const line = activeLines[index];
      const quantity = Number(line.quantity);

      if (!line.productId) {
        toast.error(`${sectionLabel}, ligne ${index + 1}: choisis un produit.`);
        return null;
      }

      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
        toast.error(`${sectionLabel}, ligne ${index + 1}: la quantité doit être un nombre entier supérieur à 0.`);
        return null;
      }

      if (quantity > 1000000) {
        toast.error(`${sectionLabel}, ligne ${index + 1}: la quantité dépasse la limite autorisée.`);
        return null;
      }
    }

    return activeLines.map((line) => ({
      productId: line.productId,
      ...(line.productVariantId ? { productVariantId: line.productVariantId } : {}),
      quantity: Number(line.quantity),
    }));
  };

  const handleStockUpdate = () => {
    if (!stockForm.productId) {
      toast.error('Choisis un produit à ajuster.');
      return;
    }

    const stockQuantity = Number(stockForm.stockQuantity || 0);
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      toast.error('Le stock doit être valide.');
      return;
    }

    updateStockMutation.mutate({
      productId: stockForm.productId,
      ...(stockForm.productVariantId ? { productVariantId: stockForm.productVariantId } : {}),
      stockQuantity,
    });
  };

  const handleAssignOrder = (orderId: string) => {
    const current = assignmentForm[orderId];
    if (!current?.deliveryAgentId) {
      toast.error('Choisis un livreur pour cette commande.');
      return;
    }

    assignMutation.mutate({
      orderId,
      payload: {
        deliveryAgentId: current.deliveryAgentId,
        deliveryZone: current.deliveryZone || undefined,
      },
    });
  };

  const openDeliveryNoteBuilder = (order: any) => {
    const alreadyExisting = noteDrafts[order.id];
    if (alreadyExisting) {
      setOpenNoteOrderId(order.id);
      return;
    }

    const deliveredMap = new Map<string, number>();
    (order.deliveryNotes || []).forEach((note: any) => {
      (note.items || []).forEach((item: any) => {
        if (!item.orderItemId) return;
        deliveredMap.set(item.orderItemId, (deliveredMap.get(item.orderItemId) || 0) + Number(item.deliveredQuantity || 0));
      });
    });

    setNoteDrafts((current) => ({
      ...current,
      [order.id]: {
        deliveryAgentId: order.deliveryAgent?.id || assignmentForm[order.id]?.deliveryAgentId || '',
        notes: '',
        items: (order.items || []).map((item: any) => {
          const alreadyDeliveredQuantity = deliveredMap.get(item.id) || 0;
          const remainingQuantity = Math.max(Number(item.quantity || 0) - alreadyDeliveredQuantity, 0);
          return {
            orderItemId: item.id,
            description: item.productVariant ? `${item.product.name} - ${item.productVariant.label}` : item.product.name,
            orderedQuantity: Number(item.quantity || 0),
            alreadyDeliveredQuantity,
            remainingQuantity,
            deliveredQuantity: remainingQuantity > 0 ? String(remainingQuantity) : '',
          };
        }),
      },
    }));
    setOpenNoteOrderId(order.id);
  };

  const openPosDeliveryNoteBuilder = (sale: any) => {
    const alreadyExisting = posNoteDrafts[sale.id];
    if (alreadyExisting) {
      setOpenNotePosSaleId(sale.id);
      return;
    }

    const deliveredMap = new Map<string, number>();
    (sale.deliveryNotes || []).forEach((note: any) => {
      (note.items || []).forEach((item: any) => {
        if (!item.posSaleItemId) return;
        deliveredMap.set(item.posSaleItemId, (deliveredMap.get(item.posSaleItemId) || 0) + Number(item.deliveredQuantity || 0));
      });
    });

    setPosNoteDrafts((current) => ({
      ...current,
      [sale.id]: {
        deliveryAgentId: sale.deliveryNotes?.[0]?.deliveryAgent?.id || '',
        notes: '',
        items: (sale.items || []).map((item: any) => {
          const alreadyDeliveredQuantity = deliveredMap.get(item.id) || 0;
          const remainingQuantity = Math.max(Number(item.quantity || 0) - alreadyDeliveredQuantity, 0);
          return {
            posSaleItemId: item.id,
            description: item.productVariant ? `${item.product.name} - ${item.productVariant.label}` : item.product.name,
            orderedQuantity: Number(item.quantity || 0),
            alreadyDeliveredQuantity,
            remainingQuantity,
            deliveredQuantity: remainingQuantity > 0 ? String(remainingQuantity) : '',
          };
        }),
      },
    }));
    setOpenNotePosSaleId(sale.id);
  };

  const handleCreateOrderNote = (order: any) => {
    const draft = noteDrafts[order.id];
    if (!draft) return;

    if (!draft.deliveryAgentId) {
      toast.error('Choisis un livreur pour ce bon.');
      return;
    }

    const items = draft.items
      .map((item) => ({
        orderItemId: item.orderItemId,
        deliveredQuantity: Number(item.deliveredQuantity || 0),
      }))
      .filter((item) => item.deliveredQuantity > 0);

    if (items.length === 0) {
      toast.error('Ajoute au moins une ligne avec une quantité à livrer.');
      return;
    }

    createOrderNoteMutation.mutate({
      orderId: order.id,
      payload: {
        deliveryAgentId: draft.deliveryAgentId,
        customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || undefined,
        customerPhone: order.deliveryAddress?.phoneCountryCode && order.deliveryAddress?.phoneNumber
          ? `${order.deliveryAddress.phoneCountryCode}${order.deliveryAddress.phoneNumber}`
          : undefined,
        customerAddress: [order.deliveryAddress?.addressLine1, order.deliveryAddress?.addressLine2, order.deliveryAddress?.city, order.deliveryAddress?.stateRegion]
          .filter(Boolean)
          .join(', ') || undefined,
        notes: draft.notes || undefined,
        status: 'PREPARED',
        items,
      },
    });
  };

  const handleCreatePosNote = (sale: any) => {
    const draft = posNoteDrafts[sale.id];
    if (!draft) return;

    if (!draft.deliveryAgentId) {
      toast.error('Choisis un livreur pour ce bon.');
      return;
    }

    const items = draft.items
      .map((item) => ({
        posSaleItemId: item.posSaleItemId,
        deliveredQuantity: Number(item.deliveredQuantity || 0),
      }))
      .filter((item) => item.deliveredQuantity > 0);

    if (items.length === 0) {
      toast.error('Ajoute au moins une ligne avec une quantité à livrer.');
      return;
    }

    createPosNoteMutation.mutate({
      posSaleId: sale.id,
      payload: {
        deliveryAgentId: draft.deliveryAgentId,
        customerName: sale.customerName || undefined,
        customerPhone: sale.customerPhone || undefined,
        customerAddress: sale.customerAddress || undefined,
        notes: draft.notes || undefined,
        status: 'PREPARED',
        items,
      },
    });
  };

  const handleCreateReport = () => {
    if (reportForm.title.trim().length < 3) {
      toast.error('Donne un titre clair au rapport stock.');
      return;
    }

    if (reportForm.title.trim().length > 120) {
      toast.error('Le titre du rapport ne peut pas dépasser 120 caractères.');
      return;
    }

    if (!reportForm.reportDate || Number.isNaN(new Date(`${reportForm.reportDate}T12:00:00`).getTime())) {
      toast.error('Choisis une date valide pour le rapport.');
      return;
    }

    if (reportForm.summary.trim().length > 1500) {
      toast.error('Le résumé ne peut pas dépasser 1 500 caractères.');
      return;
    }

    const stockOutputItems = prepareReportLines(reportForm.stockOutputItems, 'Production / Sortie de stock');
    const productionInputItems = prepareReportLines(reportForm.productionInputItems, 'Production / Rentrée de stock');
    const productionOrderOutputItems = prepareReportLines(
      reportForm.productionOrderOutputItems,
      'Commande / Sortie de stock production'
    );

    if (!stockOutputItems || !productionInputItems || !productionOrderOutputItems) {
      return;
    }

    if (
      reportForm.buyerShipmentIds.length === 0 &&
      stockOutputItems.length === 0 &&
      productionInputItems.length === 0 &&
      productionOrderOutputItems.length === 0
    ) {
      toast.error('Ajoute au moins une réception ou un mouvement de stock avant de publier.');
      return;
    }

    createReportMutation.mutate({
      title: reportForm.title.trim(),
      reportDate: new Date(`${reportForm.reportDate}T12:00:00`).toISOString(),
      summary: reportForm.summary.trim() || undefined,
      buyerShipmentIds: reportForm.buyerShipmentIds,
      stockOutputItems,
      productionInputItems,
      productionOrderOutputItems,
    });
  };

  if (isLoading) {
    return <div className="space-y-4">{[...Array(4)].map((_, index) => <div key={index} className="shimmer h-40 rounded-3xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Réceptions en attente', value: overview?.pendingShipments || 0, icon: '📥' },
          { label: 'Réceptions confirmées', value: overview?.receivedShipments || 0, icon: '✅' },
          { label: 'Produits stock faible', value: overview?.lowStockProducts || 0, icon: '⚠️' },
          { label: 'Commandes à assigner', value: overview?.assignableOrders || 0, icon: '🚚' },
          { label: 'Ventes POS à livrer', value: overview?.assignablePosSales || 0, icon: '🧾' },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(24,50,34,0.08)]">
            <div className="text-2xl">{item.icon}</div>
            <div className="mt-3 text-2xl font-bold text-agri-dark">{item.value}</div>
            <div className="mt-1 text-sm text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[30px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Réceptions buyer</p>
            <h2 className="mt-2 text-2xl font-semibold text-agri-dark">Expéditions à recevoir</h2>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {shipments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              Aucune expédition buyer n’a encore été envoyée.
            </div>
          ) : (
            shipments.map((shipment) => (
              <div key={shipment.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-400">
                      {shipment.buyer.firstName} {shipment.buyer.lastName}
                    </div>
                    <div className="mt-2 text-xl font-semibold text-agri-dark">{shipment.title}</div>
                    {shipment.notes && <p className="mt-2 text-sm text-gray-500">{shipment.notes}</p>}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white bg-white px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Quantité</div>
                        <div className="mt-1 font-semibold text-agri-dark">{shipment.totalQuantity}</div>
                      </div>
                      <div className="rounded-2xl border border-white bg-white px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Poids</div>
                        <div className="mt-1 font-semibold text-agri-dark">{formatWeight(shipment.totalWeightLbs)} Lbs</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        shipment.status === 'RECEIVED'
                          ? 'border-agri-green-200 bg-agri-green-50 text-agri-green-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {shipment.status === 'RECEIVED' ? 'Reçue' : 'En attente'}
                    </span>
                    <Button
                      type="button"
                      variant="primary"
                      disabled={shipment.status === 'RECEIVED' || confirmShipmentMutation.isPending}
                      onClick={() => confirmShipmentMutation.mutate(shipment.id)}
                    >
                      Confirmer réception
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-[30px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
        <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Quantités physiques</p>
        <h2 className="mt-2 text-2xl font-semibold text-agri-dark">Mettre à jour le stock</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_0.6fr_auto]">
          <select
            className="input w-full"
            value={stockForm.productId}
            onChange={(event) => setStockForm({ productId: event.target.value, productVariantId: '', stockQuantity: '' })}
          >
            <option value="">Choisir un produit</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <select
            className="input w-full"
            value={stockForm.productVariantId}
            onChange={(event) => setStockForm((current) => ({ ...current, productVariantId: event.target.value }))}
            disabled={!selectedStockProduct || selectedStockProduct.variants.length === 0}
          >
            <option value="">{selectedStockProduct?.variants.length ? 'Choisir une variante' : 'Produit sans variante'}</option>
            {selectedStockProduct?.variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            className="input w-full"
            placeholder={
              selectedStockVariant
                ? `Actuel: ${selectedStockVariant.stockQuantity}`
                : selectedStockProduct
                  ? `Actuel: ${selectedStockProduct.stockQuantity}`
                  : 'Nouveau stock'
            }
            value={stockForm.stockQuantity}
            onChange={(event) => setStockForm((current) => ({ ...current, stockQuantity: event.target.value }))}
          />
          <Button type="button" variant="primary" loading={updateStockMutation.isPending} onClick={handleStockUpdate}>
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="rounded-[30px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
        <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Logistique</p>
        <h2 className="mt-2 text-2xl font-semibold text-agri-dark">Assigner les commandes aux livreurs</h2>
        <div className="mt-5 space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              Aucune commande à traiter pour le moment.
            </div>
          ) : (
            orders.map((order) => {
              const current = assignmentForm[order.id] || { deliveryAgentId: order.deliveryAgentId || '', deliveryZone: order.deliveryZone || '' };
              const noteDraft = noteDrafts[order.id];
              return (
                <div key={order.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-gray-400">{order.orderNumber}</div>
                      <div className="mt-2 text-xl font-semibold text-agri-dark">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">{order.totalAmount?.toLocaleString('fr-FR')} HTG</div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr_auto] lg:min-w-[520px]">
                      <select
                        className="input w-full"
                        value={current.deliveryAgentId}
                        onChange={(event) =>
                          setAssignmentForm((state) => ({
                            ...state,
                            [order.id]: { ...current, deliveryAgentId: event.target.value },
                          }))
                        }
                      >
                        <option value="">Choisir un livreur</option>
                        {deliveryAgents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.firstName} {agent.lastName}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="input w-full"
                        placeholder="Zone de livraison"
                        value={current.deliveryZone}
                        onChange={(event) =>
                          setAssignmentForm((state) => ({
                            ...state,
                            [order.id]: { ...current, deliveryZone: event.target.value },
                          }))
                        }
                      />
                      <Button type="button" variant="primary" onClick={() => handleAssignOrder(order.id)}>
                        Assigner
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl border border-white bg-white px-4 py-3 text-sm">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Bons existants</div>
                      <div className="mt-1 font-semibold text-agri-dark">{(order.deliveryNotes || []).length}</div>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => openDeliveryNoteBuilder(order)}>
                      {openNoteOrderId === order.id ? 'Masquer le bon' : 'Créer un bon de livraison'}
                    </Button>
                  </div>

                  {openNoteOrderId === order.id && noteDraft && (
                    <div className="mt-4 rounded-[26px] border border-agri-green-100 bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-agri-dark">Nouveau bon partiel</div>
                          <div className="mt-1 text-sm text-gray-500">
                            Choisis les quantités de ce passage. Le système garde le reste pour les prochains bons.
                          </div>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Total à livrer maintenant</div>
                          <div className="mt-1 font-semibold text-agri-dark">
                            {noteDraft.items.reduce((sum, item) => sum + Number(item.deliveredQuantity || 0), 0)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
                        <select
                          className="input w-full"
                          value={noteDraft.deliveryAgentId}
                          onChange={(event) =>
                            setNoteDrafts((current) => ({
                              ...current,
                              [order.id]: { ...noteDraft, deliveryAgentId: event.target.value },
                            }))
                          }
                        >
                          <option value="">Choisir un livreur</option>
                          {deliveryAgents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.firstName} {agent.lastName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="input w-full"
                          placeholder="Note interne sur ce passage"
                          value={noteDraft.notes}
                          onChange={(event) =>
                            setNoteDrafts((current) => ({
                              ...current,
                              [order.id]: { ...noteDraft, notes: event.target.value },
                            }))
                          }
                        />
                      </div>

                      <div className="mt-4 overflow-x-auto rounded-[22px] border border-gray-100">
                        <table className="min-w-full text-sm">
                          <thead className="bg-[#f7f6f1]">
                            <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                              <th className="px-4 py-3">Description</th>
                              <th className="px-4 py-3">Commandé</th>
                              <th className="px-4 py-3">Déjà livré</th>
                              <th className="px-4 py-3">Reste</th>
                              <th className="px-4 py-3">Ce bon</th>
                            </tr>
                          </thead>
                          <tbody>
                            {noteDraft.items.map((item) => (
                              <tr key={item.orderItemId} className="border-t border-gray-100">
                                <td className="px-4 py-3 font-medium text-agri-dark">{item.description}</td>
                                <td className="px-4 py-3">{item.orderedQuantity}</td>
                                <td className="px-4 py-3">{item.alreadyDeliveredQuantity}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                                    {item.remainingQuantity}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.remainingQuantity}
                                    className="w-24 rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-agri-green-500"
                                    value={item.deliveredQuantity}
                                    onChange={(event) =>
                                      setNoteDrafts((current) => ({
                                        ...current,
                                        [order.id]: {
                                          ...noteDraft,
                                          items: noteDraft.items.map((line) =>
                                            line.orderItemId === item.orderItemId
                                              ? { ...line, deliveredQuantity: event.target.value }
                                              : line
                                          ),
                                        },
                                      }))
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {(order.deliveryNotes || []).length > 0 && (
                        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <div className="text-sm font-semibold text-agri-dark">Bons déjà créés pour cette commande</div>
                          <div className="mt-3 space-y-2">
                            {(order.deliveryNotes || []).map((note: any) => (
                              <div key={note.id} className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 text-sm">
                                <div className="font-medium text-agri-dark">{note.noteNumber}</div>
                                <div className="text-gray-500">{note.status}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setOpenNoteOrderId(null)}>
                          Fermer
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          loading={createOrderNoteMutation.isPending}
                          onClick={() => handleCreateOrderNote(order)}
                        >
                          Générer le bon
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-[30px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
        <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Ventes comptoir</p>
        <h2 className="mt-2 text-2xl font-semibold text-agri-dark">Créer des bons de livraison depuis le POS</h2>
        <div className="mt-5 space-y-4">
          {posSales.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              Aucune vente POS à livrer pour le moment.
            </div>
          ) : (
            posSales.map((sale) => {
              const noteDraft = posNoteDrafts[sale.id];
              return (
                <div key={sale.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-gray-400">
                        {sale.saleNumber} · {sale.documentType === 'INVOICE' ? 'Facture' : sale.documentType === 'RECEIPT' ? 'Reçu' : 'Proforma'}
                      </div>
                      <div className="mt-2 text-xl font-semibold text-agri-dark">{sale.customerName}</div>
                      <div className="mt-1 text-sm text-gray-500">
                        {sale.totalAmount?.toLocaleString('fr-FR')} HTG · {formatWeight(Number(sale.totalWeightLbs || 0))} Lbs
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-2xl border border-white bg-white px-4 py-3 text-sm">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Bons existants</div>
                        <div className="mt-1 font-semibold text-agri-dark">{(sale.deliveryNotes || []).length}</div>
                      </div>
                      <Button type="button" variant="secondary" onClick={() => openPosDeliveryNoteBuilder(sale)}>
                        {openNotePosSaleId === sale.id ? 'Masquer le bon' : 'Créer un bon de livraison'}
                      </Button>
                    </div>
                  </div>

                  {openNotePosSaleId === sale.id && noteDraft && (
                    <div className="mt-4 rounded-[26px] border border-agri-green-100 bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-agri-dark">Nouveau bon partiel POS</div>
                          <div className="mt-1 text-sm text-gray-500">
                            Prépare uniquement ce qui part maintenant. Le reste restera disponible pour les prochains bons.
                          </div>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Total à livrer maintenant</div>
                          <div className="mt-1 font-semibold text-agri-dark">
                            {noteDraft.items.reduce((sum, item) => sum + Number(item.deliveredQuantity || 0), 0)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
                        <select
                          className="input w-full"
                          value={noteDraft.deliveryAgentId}
                          onChange={(event) =>
                            setPosNoteDrafts((current) => ({
                              ...current,
                              [sale.id]: { ...noteDraft, deliveryAgentId: event.target.value },
                            }))
                          }
                        >
                          <option value="">Choisir un livreur</option>
                          {deliveryAgents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.firstName} {agent.lastName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="input w-full"
                          placeholder="Note interne sur ce passage"
                          value={noteDraft.notes}
                          onChange={(event) =>
                            setPosNoteDrafts((current) => ({
                              ...current,
                              [sale.id]: { ...noteDraft, notes: event.target.value },
                            }))
                          }
                        />
                      </div>

                      <div className="mt-4 overflow-x-auto rounded-[22px] border border-gray-100">
                        <table className="min-w-full text-sm">
                          <thead className="bg-[#f7f6f1]">
                            <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                              <th className="px-4 py-3">Description</th>
                              <th className="px-4 py-3">Commandé</th>
                              <th className="px-4 py-3">Déjà livré</th>
                              <th className="px-4 py-3">Reste</th>
                              <th className="px-4 py-3">Ce bon</th>
                            </tr>
                          </thead>
                          <tbody>
                            {noteDraft.items.map((item) => (
                              <tr key={item.posSaleItemId} className="border-t border-gray-100">
                                <td className="px-4 py-3 font-medium text-agri-dark">{item.description}</td>
                                <td className="px-4 py-3">{item.orderedQuantity}</td>
                                <td className="px-4 py-3">{item.alreadyDeliveredQuantity}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                                    {item.remainingQuantity}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.remainingQuantity}
                                    className="w-24 rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-agri-green-500"
                                    value={item.deliveredQuantity}
                                    onChange={(event) =>
                                      setPosNoteDrafts((current) => ({
                                        ...current,
                                        [sale.id]: {
                                          ...noteDraft,
                                          items: noteDraft.items.map((line) =>
                                            line.posSaleItemId === item.posSaleItemId
                                              ? { ...line, deliveredQuantity: event.target.value }
                                              : line
                                          ),
                                        },
                                      }))
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {(sale.deliveryNotes || []).length > 0 && (
                        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <div className="text-sm font-semibold text-agri-dark">Bons déjà créés pour cette vente POS</div>
                          <div className="mt-3 space-y-2">
                            {(sale.deliveryNotes || []).map((note: any) => (
                              <div key={note.id} className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 text-sm">
                                <div className="font-medium text-agri-dark">{note.noteNumber}</div>
                                <div className="text-gray-500">{note.status}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setOpenNotePosSaleId(null)}>
                          Fermer
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          loading={createPosNoteMutation.isPending}
                          onClick={() => handleCreatePosNote(sale)}
                        >
                          Générer le bon
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <StockReportComposer
        products={products}
        receivedShipments={receivedShipmentsAvailable}
        selectedBuyerReceiptsPreview={selectedBuyerReceiptsPreview}
        reportForm={reportForm}
        setReportForm={setReportForm}
        onSubmit={handleCreateReport}
        loading={createReportMutation.isPending}
        stockOutputPreview={stockOutputPreview}
        productionInputPreview={productionInputPreview}
        productionOrderOutputPreview={productionOrderOutputPreview}
        addDraftLine={addDraftLine}
        removeDraftLine={removeDraftLine}
        updateDraftLine={updateDraftLine}
      />

      <div className="rounded-[30px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
        <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Historique</p>
        <h2 className="mt-2 text-2xl font-semibold text-agri-dark">Derniers rapports stock</h2>
        <div className="mt-5 space-y-4">
          {reports.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              Aucun rapport stock n’a encore été publié.
            </div>
          ) : (
            reports.slice(0, 5).map((report) => (
              <div key={report.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-gray-400">
                  {new Date(report.reportDate).toLocaleDateString('fr-FR')}
                </div>
                <div className="mt-2 text-xl font-semibold text-agri-dark">{report.title}</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white bg-white px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Réceptions buyer</div>
                    <div className="mt-1 font-semibold text-agri-dark">{report.buyerReceiptTotalQuantity}</div>
                  </div>
                  <div className="rounded-2xl border border-white bg-white px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Sortie stock</div>
                    <div className="mt-1 font-semibold text-agri-dark">{report.stockOutputTotalQuantity}</div>
                  </div>
                  <div className="rounded-2xl border border-white bg-white px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Production rentrée</div>
                    <div className="mt-1 font-semibold text-agri-dark">{report.productionInputTotalQuantity}</div>
                  </div>
                  <div className="rounded-2xl border border-white bg-white px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Commande sortie prod.</div>
                    <div className="mt-1 font-semibold text-agri-dark">{report.productionOrderOutputTotalQuantity}</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      void triggerStockReportDownload(report.id, report.title);
                    }}
                  >
                    Télécharger le PDF
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StockReportComposer({
  products,
  receivedShipments,
  selectedBuyerReceiptsPreview,
  reportForm,
  setReportForm,
  onSubmit,
  loading,
  stockOutputPreview,
  productionInputPreview,
  productionOrderOutputPreview,
  addDraftLine,
  removeDraftLine,
  updateDraftLine,
}: any) {
  return (
    <div className="rounded-[30px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
      <p className="text-xs uppercase tracking-[0.28em] text-agri-green-600 font-semibold">Rapport stock</p>
      <h2 className="mt-2 text-2xl font-semibold text-agri-dark">Publier mon rapport de stock</h2>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <input
          type="text"
          className="input w-full"
          placeholder="Titre du rapport"
          value={reportForm.title}
          onChange={(event) => setReportForm((current: any) => ({ ...current, title: event.target.value }))}
        />
        <input
          type="date"
          className="input w-full"
          value={reportForm.reportDate}
          onChange={(event) => setReportForm((current: any) => ({ ...current, reportDate: event.target.value }))}
        />
        <textarea
          className="input min-h-[110px] w-full lg:col-span-2"
          placeholder="Résumé global du mouvement de stock"
          value={reportForm.summary}
          onChange={(event) => setReportForm((current: any) => ({ ...current, summary: event.target.value }))}
        />
      </div>

      <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50 p-4">
        <div className="text-sm font-semibold text-agri-dark">Réceptions de stock (buyer)</div>
        <div className="mt-3 grid gap-2">
          {receivedShipments.length === 0 ? (
            <div className="text-sm text-gray-500">Aucune réception buyer non encore reportée.</div>
          ) : (
            receivedShipments.map((shipment: any) => {
              const checked = reportForm.buyerShipmentIds.includes(shipment.id);
              return (
                <label key={shipment.id} className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3">
                  <div>
                    <div className="font-medium text-agri-dark">{shipment.title}</div>
                    <div className="text-sm text-gray-500">
                      {shipment.buyer.firstName} {shipment.buyer.lastName} · {shipment.totalQuantity} unités · {formatWeight(shipment.totalWeightLbs)} Lbs
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setReportForm((current: any) => ({
                        ...current,
                        buyerShipmentIds: event.target.checked
                          ? [...current.buyerShipmentIds, shipment.id]
                          : current.buyerShipmentIds.filter((id: string) => id !== shipment.id),
                      }))
                    }
                  />
                </label>
              );
            })
          )}
        </div>
        <div className="mt-4">
          <StructuredPreviewTable
            title="Tableau réception buyer"
            items={selectedBuyerReceiptsPreview.items}
            totalQuantity={selectedBuyerReceiptsPreview.totalQuantity}
            totalWeightLbs={selectedBuyerReceiptsPreview.totalWeightLbs}
            showWeight
          />
        </div>
      </div>

      <DraftTable
        title="Production / Sortie de stock"
        lines={reportForm.stockOutputItems}
        products={products}
        preview={stockOutputPreview}
        onAdd={() => addDraftLine('stockOutputItems')}
        onRemove={(lineId: string) => removeDraftLine('stockOutputItems', lineId)}
        onChange={(lineId: string, field: keyof DraftLine, value: string) => updateDraftLine('stockOutputItems', lineId, field, value)}
      />

      <DraftTable
        title="Production / Rentrée de stock"
        lines={reportForm.productionInputItems}
        products={products}
        preview={productionInputPreview}
        onAdd={() => addDraftLine('productionInputItems')}
        onRemove={(lineId: string) => removeDraftLine('productionInputItems', lineId)}
        onChange={(lineId: string, field: keyof DraftLine, value: string) => updateDraftLine('productionInputItems', lineId, field, value)}
        quantityOnly
      />

      <DraftTable
        title="Commande / Sortie de stock production"
        lines={reportForm.productionOrderOutputItems}
        products={products}
        preview={productionOrderOutputPreview}
        onAdd={() => addDraftLine('productionOrderOutputItems')}
        onRemove={(lineId: string) => removeDraftLine('productionOrderOutputItems', lineId)}
        onChange={(lineId: string, field: keyof DraftLine, value: string) => updateDraftLine('productionOrderOutputItems', lineId, field, value)}
        quantityOnly
      />

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="primary" loading={loading} onClick={onSubmit}>
          Publier le rapport stock
        </Button>
      </div>
    </div>
  );
}

function DraftTable({
  title,
  lines,
  products,
  preview,
  onAdd,
  onRemove,
  onChange,
  quantityOnly = false,
}: {
  title: string;
  lines: DraftLine[];
  products: StockProductOption[];
  preview: { totalQuantity: number; totalWeightLbs: number };
  onAdd: () => void;
  onRemove: (lineId: string) => void;
  onChange: (lineId: string, field: keyof DraftLine, value: string) => void;
  quantityOnly?: boolean;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-agri-dark">{title}</div>
        <Button type="button" variant="secondary" onClick={onAdd}>
          + Ligne
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {lines.map((line) => {
          const product = products.find((entry) => entry.id === line.productId);
          const variants = product?.variants || [];
          return (
            <div key={line.id} className="grid gap-3 rounded-2xl border border-white bg-white p-4 lg:grid-cols-[1fr_1fr_0.45fr_auto]">
              <select className="input w-full" value={line.productId} onChange={(event) => onChange(line.id, 'productId', event.target.value)}>
                <option value="">Choisir un produit</option>
                {products.map((productOption) => (
                  <option key={productOption.id} value={productOption.id}>
                    {productOption.name}
                  </option>
                ))}
              </select>
              <select
                className="input w-full"
                value={line.productVariantId}
                onChange={(event) => onChange(line.id, 'productVariantId', event.target.value)}
                disabled={!product || variants.length === 0}
              >
                <option value="">{variants.length ? 'Choisir une variante' : 'Produit sans variante'}</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="input w-full"
                value={line.quantity}
                onChange={(event) => onChange(line.id, 'quantity', event.target.value)}
                placeholder="Qté"
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => onRemove(line.id)}>
                  Retirer
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className={`mt-4 grid gap-3 ${quantityOnly ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
        <div className="rounded-2xl border border-white bg-white px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Total quantité</div>
          <div className="mt-1 font-semibold text-agri-dark">{preview.totalQuantity}</div>
        </div>
        {!quantityOnly && (
          <div className="rounded-2xl border border-white bg-white px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Poids total</div>
            <div className="mt-1 font-semibold text-agri-dark">{formatWeight(preview.totalWeightLbs)} Lbs</div>
          </div>
        )}
      </div>
    </div>
  );
}

function StructuredPreviewTable({
  title,
  items,
  totalQuantity,
  totalWeightLbs,
  showWeight = false,
}: {
  title: string;
  items: Array<{ description: string; quantity: number; lineWeightLbs?: number }>;
  totalQuantity: number;
  totalWeightLbs?: number;
  showWeight?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white bg-white p-4">
      <div className="text-sm font-semibold text-agri-dark">{title}</div>
      {items.length === 0 ? (
        <div className="mt-3 text-sm text-gray-500">Aucune ligne sélectionnée pour le moment.</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                <th className="pb-2 pr-4">Description</th>
                <th className="pb-2 pr-4">Quantité</th>
                {showWeight && <th className="pb-2">Poids</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.description}-${index}`} className="border-t border-gray-100 text-gray-600">
                  <td className="py-3 pr-4 font-medium text-agri-dark">{item.description}</td>
                  <td className="py-3 pr-4">{item.quantity}</td>
                  {showWeight && <td className="py-3">{formatWeight(Number(item.lineWeightLbs || 0))} Lbs</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 text-agri-dark">
                <td className="pt-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Totals</td>
                <td className="pt-3 pr-4 font-bold">{totalQuantity}</td>
                {showWeight && <td className="pt-3 font-bold">{formatWeight(Number(totalWeightLbs || 0))} Lbs</td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
