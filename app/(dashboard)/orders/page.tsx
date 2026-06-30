'use client';

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { clearPendingPaymentSession } from '@/lib/payment-session';
import { cancelMyOrder, getMyOrders, verifyOrderPayment } from '@/lib/services/orders';
import Button from '@/components/ui/Button';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  PROCESSING: { label: 'En cours', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  SHIPPED: { label: 'Expédié', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  DELIVERED: { label: 'Livré', color: 'bg-green-50 text-green-700 border-green-200' },
  DELIVERY_FAILED: { label: 'Échec livraison', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  CANCELLED: { label: 'Annulé', color: 'bg-red-50 text-red-700 border-red-200' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Paiement en attente', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  PARTIALLY_PAID: { label: 'Partiellement payé', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  PAID: { label: 'Payé', color: 'bg-green-50 text-green-700 border-green-200' },
  FAILED: { label: 'Échoué', color: 'bg-red-50 text-red-700 border-red-200' },
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function canCustomerCancelOrder(order: {
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
}) {
  return order.paymentMethod === 'CASH' && ['PENDING', 'PROCESSING'].includes(order.status) && !['PAID', 'PARTIALLY_PAID'].includes(order.paymentStatus);
}

export default function MyOrdersPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const hasAutoVerifiedRef = useRef(false);
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => getMyOrders(1, 20),
  });
  const verifyPaymentMutation = useMutation({
    mutationFn: (orderId: string) => verifyOrderPayment(orderId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      if (result.payment.transactionStatus === 'PAID') {
        clearPendingPaymentSession(result.order.id);
      }
      toast.success(
        result.payment.transactionStatus === 'PAID'
          ? 'Paiement confirmé avec succès.'
          : 'Paiement toujours en attente. Réessayez dans un instant.'
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de vérifier le paiement.');
    },
  });
  const cancelMutation = useMutation({
    mutationFn: cancelMyOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      toast.success('Commande annulée avec succès.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible d’annuler cette commande.');
    },
  });

  const orders = ordersData?.orders || [];
  const returnFromPayment = searchParams.get('payment') === 'return';

  useEffect(() => {
    if (!returnFromPayment || hasAutoVerifiedRef.current || isLoading || orders.length === 0 || verifyPaymentMutation.isPending) {
      return;
    }

    const latestPendingOnlineOrder = orders.find((order) =>
      order.paymentMethod &&
      order.paymentMethod !== 'CASH' &&
      order.paymentStatus !== 'PAID'
    );

    if (!latestPendingOnlineOrder) {
      hasAutoVerifiedRef.current = true;
      toast.success('Aucune commande en attente de confirmation n’a été trouvée.');
      return;
    }

    hasAutoVerifiedRef.current = true;
    verifyPaymentMutation.mutate(latestPendingOnlineOrder.id);
  }, [isLoading, orders, returnFromPayment, verifyPaymentMutation]);

  const getOrderItemsPreview = (order: any) => {
    const items = order.orderItems || [];
    const firstImage = items.find((item: any) => item.product?.images?.[0]?.url)?.product?.images?.[0]?.url;
    const itemCount = items.reduce((total: number, item: any) => total + item.quantity, 0);

    return {
      firstImage,
      itemCount,
      itemNames:
        items
          .slice(0, 2)
          .map((item: any) =>
            item.productVariant?.label
              ? `${item.product.name} (${item.productVariant.label})`
              : item.product.name
          )
          .join(' • ') || 'Commande directe',
    };
  };

  return (
    <DashboardShell
      currentPath="/orders"
      title="Mes Commandes"
      subtitle="Retrouvez vos achats, leur paiement, la livraison et l’historique de suivi."
    >
        <div className="card p-6 shadow-sm border border-gray-100">
          <div className="space-y-4 lg:hidden">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="shimmer h-40 w-full rounded-2xl" />
              ))
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const status = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
                const paymentStatus = PAYMENT_STATUS_LABELS[order.paymentStatus] || PAYMENT_STATUS_LABELS.PENDING;
                const itemsLabel = order.orderItems?.map((item) =>
                  item.productVariant?.label
                    ? `${item.product.name} (${item.productVariant.label})`
                    : item.product.name
                ).join(', ') || 'Commande directe';
                const requiresOnlineVerification =
                  order.paymentMethod && order.paymentMethod !== 'CASH' && order.paymentStatus !== 'PAID';
                const canCancel = canCustomerCancelOrder(order);

                const preview = getOrderItemsPreview(order);

                return (
                  <div key={order.id} className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_18px_50px_rgba(24,50,34,0.08)]">
                    <Link href={`/orders/${order.id}`} className="block">
                      <div className="flex items-stretch gap-4 p-4">
                        <div className="flex w-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-agri-green-100 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.18),_transparent_35%),linear-gradient(135deg,_#f9fbf4_0%,_#eef6e8_100%)]">
                          {preview.firstImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={preview.firstImage}
                              alt={itemsLabel}
                              className="h-full w-full object-contain p-3"
                            />
                          ) : (
                            <span className="px-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-agri-green-700/60">
                              AGRIKIRI
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
                                {order.orderNumber || `AGRO-${order.id.slice(0, 8)}`}
                              </div>
                              <div className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-agri-dark">
                                {preview.itemNames}
                              </div>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.color}`}>
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${paymentStatus.color}`}>
                              {paymentStatus.label}
                            </span>
                            <span className="inline-flex rounded-full bg-agri-green-50 px-3 py-1 text-[11px] font-semibold text-agri-green-700">
                              {preview.itemCount} article{preview.itemCount > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="mt-4 flex items-end justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                {new Date(order.createdAt).toLocaleDateString('fr-HT')}
                              </div>
                              <div className="mt-1 text-xl font-bold text-agri-dark">
                                {formatMoney(order.totalAmount)} HTG
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-agri-dark px-3 py-2 text-xs font-semibold text-white">
                              Ouvrir
                              <span aria-hidden="true">→</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {requiresOnlineVerification && (
                      <div className="border-t border-gray-100 bg-amber-50/80 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                              Paiement en attente
                            </div>
                            <div className="mt-1 text-sm text-amber-800">
                              Relance la vérification si tu viens de revenir de PLOP PLOP.
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={verifyPaymentMutation.isPending && verifyPaymentMutation.variables === order.id}
                            onClick={() => verifyPaymentMutation.mutate(order.id)}
                          >
                            Vérifier
                          </Button>
                        </div>
                      </div>
                    )}
                    {canCancel && (
                      <div className="border-t border-gray-100 bg-red-50/70 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                              Annulation possible
                            </div>
                            <div className="mt-1 text-sm text-red-800">
                              Cette commande n’est pas encore partie en livraison.
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={cancelMutation.isPending && cancelMutation.variables === order.id}
                            onClick={() => {
                              if (window.confirm('Annuler cette commande maintenant ? Cette action est irréversible.')) {
                                cancelMutation.mutate(order.id);
                              }
                            }}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-gray-400 italic">
                <div className="text-4xl mb-4">📦</div>
                <p>Vous n'avez pas encore passé de commande.</p>
                <Link href="/shop" className="mt-4 inline-block text-agri-green-600 font-bold hover:underline">
                  Aller à la boutique →
                </Link>
              </div>
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto mt-2">
            <table className="table-agri">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Produit(s)</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}><td colSpan={6}><div className="shimmer h-12 w-full rounded-xl" /></td></tr>
                  ))
                ) : orders.length > 0 ? (
                  orders.map((order) => {
                    const status = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
                    const paymentStatus = PAYMENT_STATUS_LABELS[order.paymentStatus] || PAYMENT_STATUS_LABELS.PENDING;
                    const requiresOnlineVerification =
                      order.paymentMethod && order.paymentMethod !== 'CASH' && order.paymentStatus !== 'PAID';
                    const canCancel = canCustomerCancelOrder(order);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="font-mono text-xs font-bold text-gray-500 uppercase">
                          {order.orderNumber || `AGRO-${order.id.slice(0, 8)}`}
                        </td>
                        <td className="max-w-[200px] truncate">
                          {order.orderItems?.map((item) =>
                            item.productVariant?.label
                              ? `${item.product.name} (${item.productVariant.label})`
                              : item.product.name
                          ).join(', ') || 'Commande directe'}
                        </td>
                        <td className="font-bold text-agri-dark">
                          {formatMoney(order.totalAmount)} HTG
                        </td>
                        <td>
                          <span className={`badge border ${status.color}`}>
                            {status.label}
                          </span>
                          <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatus.color}`}>
                            {paymentStatus.label}
                          </div>
                        </td>
                        <td className="text-gray-400 text-sm">
                          {new Date(order.createdAt).toLocaleDateString('fr-HT')}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {requiresOnlineVerification && (
                              <Button
                                variant="primary"
                                size="sm"
                                loading={verifyPaymentMutation.isPending && verifyPaymentMutation.variables === order.id}
                                onClick={() => verifyPaymentMutation.mutate(order.id)}
                              >
                                Vérifier
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                variant="secondary"
                                size="sm"
                                loading={cancelMutation.isPending && cancelMutation.variables === order.id}
                                onClick={() => {
                                  if (window.confirm('Annuler cette commande maintenant ? Cette action est irréversible.')) {
                                    cancelMutation.mutate(order.id);
                                  }
                                }}
                              >
                                Annuler
                              </Button>
                            )}
                            <Link href={`/orders/${order.id}`}>
                              <Button variant="secondary" size="sm">Détails</Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-gray-400 italic">
                      <div className="text-4xl mb-4">📦</div>
                      <p>Vous n'avez pas encore passé de commande.</p>
                      <Link href="/shop" className="mt-4 inline-block text-agri-green-600 font-bold hover:underline">
                        Aller à la boutique →
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </DashboardShell>
  );
}
