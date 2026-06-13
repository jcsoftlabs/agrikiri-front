'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { getAdminProducts } from '@/lib/services/products';
import {
  createBuyerStockShipment,
  getMyBuyerStockShipments,
  type BuyerStockShipment,
} from '@/lib/services/stock';

type ShipmentLine = {
  id: string;
  productId: string;
  productVariantId: string;
  quantity: string;
};

function createEmptyLine(): ShipmentLine {
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

export default function BuyerStockShipments() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    notes: '',
    lines: [createEmptyLine()],
  });

  const { data: productData } = useQuery({
    queryKey: ['buyer-stock-products'],
    queryFn: () => getAdminProducts({ limit: 200 }),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['buyer-stock-shipments'],
    queryFn: getMyBuyerStockShipments,
  });

  const createMutation = useMutation({
    mutationFn: createBuyerStockShipment,
    onSuccess: () => {
      toast.success('Expédition envoyée au gestionnaire de stock');
      setForm({
        title: '',
        notes: '',
        lines: [createEmptyLine()],
      });
      queryClient.invalidateQueries({ queryKey: ['buyer-stock-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['stock-dashboard'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible d’envoyer cette expédition'),
  });

  const products = productData?.products || [];

  const shipmentPreview = useMemo(() => {
    return form.lines.reduce(
      (acc, line) => {
        const product = products.find((entry) => entry.id === line.productId);
        if (!product) return acc;
        const variant = product.variants.find((entry) => entry.id === line.productVariantId);
        const quantity = Number(line.quantity || 0);
        const unitWeight = Number((variant ? variant.weightLbs : product.weightLbs) || 0);
        acc.totalQuantity += quantity;
        acc.totalWeightLbs += quantity * unitWeight;
        return acc;
      },
      { totalQuantity: 0, totalWeightLbs: 0 }
    );
  }, [form.lines, products]);

  const updateLine = (lineId: string, field: keyof ShipmentLine, value: string) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => {
        if (line.id !== lineId) return line;
        if (field === 'productId') {
          return { ...line, productId: value, productVariantId: '', quantity: line.quantity };
        }
        return { ...line, [field]: value };
      }),
    }));
  };

  const addLine = () => {
    setForm((current) => ({ ...current, lines: [...current.lines, createEmptyLine()] }));
  };

  const removeLine = (lineId: string) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.length > 1 ? current.lines.filter((line) => line.id !== lineId) : [createEmptyLine()],
    }));
  };

  const handleSubmit = () => {
    const preparedLines = form.lines
      .filter((line) => line.productId && Number(line.quantity || 0) > 0)
      .map((line) => ({
        productId: line.productId,
        ...(line.productVariantId ? { productVariantId: line.productVariantId } : {}),
        quantity: Number(line.quantity || 0),
      }));

    if (form.title.trim().length < 3) {
      toast.error('Donne un titre clair à l’expédition.');
      return;
    }

    if (preparedLines.length === 0) {
      toast.error('Ajoute au moins une ligne produit.');
      return;
    }

    createMutation.mutate({
      title: form.title.trim(),
      notes: form.notes.trim() || undefined,
      items: preparedLines,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-agri-green-100 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-agri-green-50 px-3 py-1 text-xs font-bold text-agri-green-700">
              📦 EXPÉDITION VERS STOCK
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-agri-dark">Déclarer ce que j’envoie au dépôt</h3>
            <p className="mt-1 text-sm text-gray-500">
              Le gestionnaire de stock verra cette expédition, la confirmera à réception, et le stock ne sera crédité qu’à ce moment-là.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">En attente réception</div>
            <div className="mt-1 text-xl font-bold text-agri-dark">
              {shipments.filter((shipment) => shipment.status === 'PENDING_RECEIPT').length}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Titre</label>
            <input
              type="text"
              className="input w-full"
              placeholder="Ex: Chargement de riz Sheilla pour dépôt central"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Note</label>
            <input
              type="text"
              className="input w-full"
              placeholder="Précise la provenance, le marché, ou une observation utile"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {form.lines.map((line, index) => {
            const product = products.find((entry) => entry.id === line.productId);
            const variants = product?.variants || [];
            return (
              <div key={line.id} className="grid gap-3 rounded-3xl border border-gray-100 bg-gray-50 p-4 lg:grid-cols-[1.1fr_1fr_0.5fr_auto]">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Produit</label>
                  <select
                    className="input w-full"
                    value={line.productId}
                    onChange={(event) => updateLine(line.id, 'productId', event.target.value)}
                  >
                    <option value="">Choisir un produit</option>
                    {products.map((productOption) => (
                      <option key={productOption.id} value={productOption.id}>
                        {productOption.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Variante</label>
                  <select
                    className="input w-full"
                    value={line.productVariantId}
                    onChange={(event) => updateLine(line.id, 'productVariantId', event.target.value)}
                    disabled={!product || variants.length === 0}
                  >
                    <option value="">{variants.length ? 'Choisir une variante' : 'Produit sans variante'}</option>
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Quantité</label>
                  <input
                    type="number"
                    min={1}
                    className="input w-full"
                    value={line.quantity}
                    onChange={(event) => updateLine(line.id, 'quantity', event.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => removeLine(line.id)}>
                    Retirer
                  </Button>
                  {index === form.lines.length - 1 && (
                    <Button type="button" variant="secondary" onClick={addLine}>
                      + Ligne
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Total quantité</div>
            <div className="mt-1 text-2xl font-bold text-agri-dark">{shipmentPreview.totalQuantity}</div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Poids total</div>
            <div className="mt-1 text-2xl font-bold text-agri-dark">{formatWeight(shipmentPreview.totalWeightLbs)} Lbs</div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="primary" loading={createMutation.isPending} onClick={handleSubmit}>
            Envoyer au gestionnaire de stock
          </Button>
        </div>
      </div>

      <div className="rounded-[30px] border border-agri-green-100 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
        <h3 className="text-2xl font-semibold text-agri-dark">Mes expéditions stock</h3>
        <div className="mt-5 space-y-4">
          {shipments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              Aucune expédition stock n’a encore été envoyée.
            </div>
          ) : (
            shipments.map((shipment: BuyerStockShipment) => (
              <div key={shipment.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-400">
                      {new Date(shipment.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="mt-2 text-xl font-semibold text-agri-dark">{shipment.title}</div>
                    {shipment.notes && <p className="mt-2 text-sm text-gray-500">{shipment.notes}</p>}
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      shipment.status === 'RECEIVED'
                        ? 'border-agri-green-200 bg-agri-green-50 text-agri-green-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {shipment.status === 'RECEIVED' ? 'Réception confirmée' : 'En attente de réception'}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white bg-white px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Quantité totale</div>
                    <div className="mt-1 font-semibold text-agri-dark">{shipment.totalQuantity}</div>
                  </div>
                  <div className="rounded-2xl border border-white bg-white px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Poids total</div>
                    <div className="mt-1 font-semibold text-agri-dark">{formatWeight(shipment.totalWeightLbs)} Lbs</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
