'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { getOrderDetail, verifyOrderPayment } from '@/lib/services/orders';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700 border-gray-200',
  PROCESSING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  SHIPPED: 'bg-blue-50 text-blue-700 border-blue-200',
  DELIVERED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: 'Paiement en attente',
  PAID: 'Payée',
  FAILED: 'Paiement échoué',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PLOPPLOP: 'PLOP PLOP',
  MONCASH: 'MonCash',
  NATCASH: 'NatCash',
  KASHPAW: 'Kashpaw',
  CASH: 'Paiement à la livraison',
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => getOrderDetail(orderId),
    enabled: Boolean(orderId),
  });

  const verifyMutation = useMutation({
    mutationFn: verifyOrderPayment,
    onSuccess: (result) => {
      queryClient.setQueryData(['order-detail', orderId], result.order);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      toast.success(
        result.payment.transactionStatus === 'PAID'
          ? 'Paiement confirmé avec succès.'
          : 'Paiement toujours en attente.'
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de vérifier le paiement.');
    },
  });

  const requiresOnlineVerification =
    order?.paymentMethod && order.paymentMethod !== 'CASH' && order.paymentStatus !== 'PAID';

  return (
    <div className="min-h-screen bg-agri-cream">
      <div className="bg-agri-dark pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <Link href="/orders" className="text-white/70 hover:text-white text-sm">
            ← Mes commandes
          </Link>
          <h1 className="font-display text-4xl text-white mt-6">
            {order?.orderNumber || 'Commande'}
          </h1>
          <p className="text-white/70 mt-2">
            Suivez votre paiement, votre livraison et les étapes de traitement en un seul endroit.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-4 pb-12">
        {isLoading || !order ? (
          <div className="card p-6">
            <div className="shimmer h-96 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="card p-6 border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Résumé</p>
                    <h2 className="font-display text-3xl text-agri-dark">{order.orderNumber}</h2>
                    <p className="text-sm text-gray-500 mt-2">
                      Commande passée le {new Date(order.createdAt).toLocaleDateString('fr-HT')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_STYLES[order.status] || STATUS_STYLES.PENDING}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_STYLES[order.paymentStatus === 'PAID' ? 'DELIVERED' : order.paymentStatus === 'FAILED' ? 'CANCELLED' : 'PENDING']}`}>
                      {PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Montant</div>
                    <div className="text-2xl font-bold text-agri-green-700">
                      {order.totalAmount.toLocaleString()} HTG
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Paiement</div>
                    <div className="font-semibold text-agri-dark">
                      {order.paymentMethod ? (PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod) : 'N/A'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Transporteur</div>
                    <div className="font-semibold text-agri-dark">{order.carrierName || 'Non renseigné'}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Suivi</div>
                    <div className="font-semibold text-agri-dark">{order.trackingNumber || 'En attente'}</div>
                  </div>
                </div>

                {requiresOnlineVerification && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="font-semibold text-amber-800">Paiement encore en attente</div>
                      <div className="text-sm text-amber-700 mt-1">
                        Si tu viens de revenir de la plateforme de paiement, tu peux relancer une vérification ici.
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      loading={verifyMutation.isPending}
                      onClick={() => verifyMutation.mutate(order.id)}
                    >
                      Vérifier le paiement
                    </Button>
                  </div>
                )}
              </div>

              <div className="card p-6 border border-gray-100">
                <h2 className="font-display text-2xl text-agri-dark mb-5">Produits commandés</h2>
                <div className="space-y-4">
                  {(order.orderItems || []).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="font-semibold text-agri-dark">{item.product.name}</div>
                        {item.productVariant?.label && (
                          <div className="text-sm text-gray-500 mt-1">Format : {item.productVariant.label}</div>
                        )}
                        <div className="text-sm text-gray-400 mt-2">Quantité : {item.quantity}</div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-sm text-gray-400">Prix unitaire</div>
                        <div className="font-semibold text-agri-dark">{Number(item.price).toLocaleString()} HTG</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6 border border-gray-100">
                <h2 className="font-display text-2xl text-agri-dark mb-5">Historique de suivi</h2>
                <div className="space-y-4">
                  {(order.trackingEvents || [])
                    .filter((event) => event.isCustomerVisible)
                    .map((event) => (
                      <div key={event.id} className="relative pl-6">
                        <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-agri-green-600" />
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                              <div className="font-semibold text-agri-dark">{event.title}</div>
                              {event.description && <div className="text-sm text-gray-500 mt-1">{event.description}</div>}
                            </div>
                            <div className="text-xs text-gray-400 whitespace-nowrap">
                              {new Date(event.createdAt).toLocaleString('fr-HT')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-6 border border-gray-100">
                <h2 className="font-display text-2xl text-agri-dark mb-5">Adresse de livraison</h2>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 text-gray-600 leading-relaxed">
                  <div className="font-semibold text-agri-dark">{order.deliveryAddress?.fullName}</div>
                  <div>{order.deliveryAddress?.phoneCountryCode} {order.deliveryAddress?.phoneNumber}</div>
                  <div className="mt-3">{order.deliveryAddress?.addressLine1}</div>
                  {order.deliveryAddress?.addressLine2 && <div>{order.deliveryAddress?.addressLine2}</div>}
                  <div>{order.deliveryAddress?.city}, {order.deliveryAddress?.stateRegion}</div>
                  {order.deliveryAddress?.postalCode && <div>{order.deliveryAddress?.postalCode}</div>}
                  <div>{order.deliveryAddress?.countryCode}</div>
                </div>
              </div>

              <div className="card p-6 border border-gray-100">
                <h2 className="font-display text-2xl text-agri-dark mb-5">Livraison</h2>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Date estimée</div>
                    <div className="font-semibold text-agri-dark">
                      {order.estimatedDeliveryDate
                        ? new Date(order.estimatedDeliveryDate).toLocaleDateString('fr-HT')
                        : 'Non définie'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Expédition</div>
                    <div className="font-semibold text-agri-dark">
                      {order.shippedAt ? new Date(order.shippedAt).toLocaleString('fr-HT') : 'Pas encore expédiée'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Livraison finale</div>
                    <div className="font-semibold text-agri-dark">
                      {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('fr-HT') : 'Pas encore livrée'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
