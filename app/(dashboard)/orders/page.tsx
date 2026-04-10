'use client';

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import DashboardNav from '@/components/dashboard/DashboardNav';
import { clearPendingPaymentSession } from '@/lib/payment-session';
import { getMyOrders, verifyOrderPayment } from '@/lib/services/orders';
import Button from '@/components/ui/Button';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  PROCESSING: { label: 'En cours', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  SHIPPED: { label: 'Expédié', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  DELIVERED: { label: 'Livré', color: 'bg-green-50 text-green-700 border-green-200' },
  CANCELLED: { label: 'Annulé', color: 'bg-red-50 text-red-700 border-red-200' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Paiement en attente', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  PAID: { label: 'Payé', color: 'bg-green-50 text-green-700 border-green-200' },
  FAILED: { label: 'Échoué', color: 'bg-red-50 text-red-700 border-red-200' },
};

export default function MyOrdersPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const hasAutoVerifiedRef = useRef(false);
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => getMyOrders(1, 20),
  });
  const verifyPaymentMutation = useMutation({
    mutationFn: verifyOrderPayment,
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

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <DashboardNav currentPath="/orders" />

      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-agri-dark">Mes Commandes</h1>
          <p className="text-gray-500 mt-1">Retrouve toutes tes commandes, leur paiement et leur suivi logistique.</p>
        </div>

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

                return (
                  <div key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs font-bold text-gray-500 uppercase">
                          {order.orderNumber || `AGRO-${order.id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(order.createdAt).toLocaleDateString('fr-HT')}
                        </div>
                      </div>
                      <span className={`badge border ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatus.color}`}>
                      {paymentStatus.label}
                    </span>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Produits</div>
                      <div className="text-sm text-agri-dark leading-relaxed">{itemsLabel}</div>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Montant</div>
                        <div className="font-bold text-agri-dark">
                          {order.totalAmount.toLocaleString()} HTG
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {requiresOnlineVerification && (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={verifyPaymentMutation.isPending && verifyPaymentMutation.variables === order.id}
                            onClick={() => verifyPaymentMutation.mutate(order.id)}
                          >
                            Vérifier paiement
                          </Button>
                        )}
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="secondary" size="sm">Détails</Button>
                        </Link>
                      </div>
                    </div>
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
                          {order.totalAmount.toLocaleString()} HTG
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
      </main>
    </div>
  );
}
