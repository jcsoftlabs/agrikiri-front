'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { cancelMyOrder, downloadOrderInvoice, getOrderDetail, verifyOrderPayment } from '@/lib/services/orders';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700 border-gray-200',
  PROCESSING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  SHIPPED: 'bg-blue-50 text-blue-700 border-blue-200',
  DELIVERED: 'bg-green-50 text-green-700 border-green-200',
  DELIVERY_FAILED: 'bg-orange-50 text-orange-700 border-orange-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  DELIVERY_FAILED: 'Échec livraison',
  CANCELLED: 'Annulée',
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: 'Paiement en attente',
  PARTIALLY_PAID: 'Paiement partiel reçu',
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

const DELIVERY_MODE_LABELS: Record<string, string> = {
  INTERNAL: 'Livraison AGRIKIRI',
  EXTERNAL: 'Transporteur externe',
};

function canCustomerCancelOrder(order: {
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
}) {
  return order.paymentMethod === 'CASH' && ['PENDING', 'PROCESSING'].includes(order.status) && !['PAID', 'PARTIALLY_PAID'].includes(order.paymentStatus);
}

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

  const invoiceMutation = useMutation({
    mutationFn: downloadOrderInvoice,
    onSuccess: (blob) => {
      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `Facture_${order?.orderNumber || 'commande'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de télécharger la facture.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelMyOrder,
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(['order-detail', orderId], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      toast.success('Commande annulée avec succès.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible d’annuler cette commande.');
    },
  });

  const requiresOnlineVerification =
    order?.paymentMethod && order.paymentMethod !== 'CASH' && order.paymentStatus !== 'PAID';
  const canCancel = order ? canCustomerCancelOrder(order) : false;

  const visibleTrackingEvents = order?.trackingEvents?.filter((event) => event.isCustomerVisible) || [];

  return (
    <DashboardShell
      currentPath="/orders"
      title={order?.orderNumber || 'Commande'}
      subtitle="Suivez le paiement, la livraison, les produits commandés et téléchargez votre facture."
      headerAction={
        <Link href="/orders" className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-agri-green-300 hover:text-agri-green-700">
          ← Mes commandes
        </Link>
      }
    >
      <div className="pb-4">
        {isLoading || !order ? (
          <div className="card p-6">
            <div className="shimmer h-96 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-[0_22px_70px_rgba(24,50,34,0.09)]">
                <div className="border-b border-agri-green-100 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.18),_transparent_35%),linear-gradient(135deg,_#f7fbf2_0%,_#edf6e8_100%)] p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-agri-green-700/60 mb-2">Résumé</p>
                      <h2 className="font-display text-3xl text-agri-dark">{order.orderNumber}</h2>
                      <p className="mt-2 text-sm text-gray-500">
                        Commande passée le {new Date(order.createdAt).toLocaleDateString('fr-HT')}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_STYLES[order.status] || STATUS_STYLES.PENDING}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${
                          order.paymentStatus === 'PAID'
                            ? STATUS_STYLES.DELIVERED
                            : order.paymentStatus === 'PARTIALLY_PAID'
                              ? STATUS_STYLES.DELIVERY_FAILED
                              : order.paymentStatus === 'FAILED'
                                ? STATUS_STYLES.CANCELLED
                                : STATUS_STYLES.PENDING
                        }`}
                      >
                        {PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={invoiceMutation.isPending}
                      onClick={() => invoiceMutation.mutate(order.id)}
                    >
                      Télécharger la facture
                    </Button>
                    {requiresOnlineVerification && (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(order.id)}
                      >
                        Vérifier le paiement
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={cancelMutation.isPending}
                        onClick={() => {
                          if (window.confirm('Annuler cette commande maintenant ? Cette action est irréversible.')) {
                            cancelMutation.mutate(order.id);
                          }
                        }}
                      >
                        Annuler la commande
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Sous-total</div>
                      <div className="text-2xl font-bold text-agri-dark">
                        {(order.subtotalAmount ?? order.totalAmount).toLocaleString()} HTG
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Livraison</div>
                      <div className="text-2xl font-bold text-agri-dark">
                        {(order.deliveryFee ?? 0).toLocaleString()} HTG
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Montant total</div>
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
                      <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Mode de livraison</div>
                      <div className="font-semibold text-agri-dark">
                        {order.deliveryMode ? (DELIVERY_MODE_LABELS[order.deliveryMode] || order.deliveryMode) : 'Non renseigné'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">
                        {order.deliveryMode === 'INTERNAL' ? 'Référence de suivi' : 'Suivi'}
                      </div>
                      <div className="font-semibold text-agri-dark">{order.trackingNumber || 'En attente'}</div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Articles</div>
                      <div className="font-semibold text-agri-dark">
                        {(order.orderItems || []).reduce((total, item) => total + item.quantity, 0)} produit(s)
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Étapes visibles</div>
                      <div className="font-semibold text-agri-dark">{visibleTrackingEvents.length} mise(s) à jour</div>
                    </div>
                    {order.paymentMethod === 'CASH' && (
                      <>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Montant encaissé</div>
                          <div className="font-semibold text-agri-dark">
                            {(order.amountCollected ?? 0).toLocaleString()} HTG
                          </div>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Reste à encaisser</div>
                          <div className="font-semibold text-amber-700">
                            {(order.amountRemaining ?? Math.max(0, order.totalAmount - (order.amountCollected ?? 0))).toLocaleString()} HTG
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {requiresOnlineVerification && (
                <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
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

              <div className="card p-6 border border-gray-100">
                <h2 className="font-display text-2xl text-agri-dark mb-5">Produits commandés</h2>
                <div className="space-y-4">
                  {(order.orderItems || []).map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-gray-100 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.14),_transparent_36%),linear-gradient(135deg,_#f9fbf4_0%,_#eef6e8_100%)] flex items-center justify-center">
                          {item.product.images?.[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.product.images[0].url}
                              alt={item.product.name}
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <span className="text-xs font-semibold tracking-[0.2em] text-agri-green-700/60">
                              AGRIKIRI
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-agri-dark">{item.product.name}</div>
                        {item.productVariant?.label && (
                          <div className="text-sm text-gray-500 mt-1">Format : {item.productVariant.label}</div>
                        )}
                          <div className="text-sm text-gray-400 mt-2">Quantité : {item.quantity}</div>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-sm text-gray-400">Prix unitaire</div>
                        <div className="font-semibold text-agri-dark">{Number(item.price).toLocaleString()} HTG</div>
                        <div className="text-sm text-agri-green-700 mt-2">
                          Total : {(Number(item.price) * item.quantity).toLocaleString()} HTG
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6 border border-gray-100">
                <h2 className="font-display text-2xl text-agri-dark mb-5">Historique de suivi</h2>
                <div className="space-y-4">
                  {visibleTrackingEvents.map((event, index) => (
                      <div key={event.id} className="relative pl-6">
                        <span className={`absolute left-0 top-2 h-3 w-3 rounded-full ${index === 0 ? 'bg-agri-gold-500' : 'bg-agri-green-600'}`} />
                        {index < visibleTrackingEvents.length - 1 && (
                          <span className="absolute left-[5px] top-5 h-[calc(100%+0.75rem)] w-px bg-agri-green-100" />
                        )}
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
                    <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Transport / service</div>
                    <div className="font-semibold text-agri-dark">
                      {order.deliveryMode === 'INTERNAL'
                        ? order.carrierName || 'Livraison AGRIKIRI'
                        : order.carrierName || 'Non renseigné'}
                    </div>
                  </div>
                  {order.deliveryMode === 'INTERNAL' && (
                    <>
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Livreur AGRIKIRI</div>
                        <div className="font-semibold text-agri-dark">{order.deliveryAgentName || 'Non assigné'}</div>
                        {order.deliveryAgentPhone && (
                          <div className="text-sm text-gray-500 mt-1">{order.deliveryAgentPhone}</div>
                        )}
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Zone de livraison</div>
                        <div className="font-semibold text-agri-dark">{order.deliveryZone || 'Non définie'}</div>
                      </div>
                    </>
                  )}
                  {order.deliveryProofPhotoUrl && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-3">Preuve de livraison</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={order.deliveryProofPhotoUrl}
                        alt="Preuve de livraison"
                        className="h-44 w-full rounded-2xl object-cover"
                      />
                      {order.deliveryRecipientName && (
                        <div className="mt-3 font-semibold text-agri-dark">Reçu par : {order.deliveryRecipientName}</div>
                      )}
                      {order.deliveryProofNote && (
                        <div className="mt-2 text-sm text-gray-500">{order.deliveryProofNote}</div>
                      )}
                    </div>
                  )}
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

              {order.status === 'DELIVERED' && (
                <div className="card p-6 border border-gray-100">
                  <h2 className="font-display text-2xl text-agri-dark mb-5">Preuve de livraison</h2>
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Destinataire</div>
                      <div className="font-semibold text-agri-dark">{order.deliveryRecipientName || 'Non renseigné'}</div>
                      {order.deliveryProofCapturedAt && (
                        <div className="text-sm text-gray-500 mt-2">
                          Capturé le {new Date(order.deliveryProofCapturedAt).toLocaleString('fr-HT')}
                        </div>
                      )}
                    </div>
                    {order.deliveryProofNote && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Note du livreur</div>
                        <div className="text-gray-600 leading-relaxed">{order.deliveryProofNote}</div>
                      </div>
                    )}
                    {order.deliveredLatitude != null && order.deliveredLongitude != null && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Position capturée</div>
                        <div className="font-semibold text-agri-dark">
                          {order.deliveredLatitude.toFixed(5)}, {order.deliveredLongitude.toFixed(5)}
                        </div>
                        {order.deliveredLocationAccuracy != null && (
                          <div className="text-sm text-gray-500 mt-1">
                            Précision estimée : {Math.round(order.deliveredLocationAccuracy)} m
                          </div>
                        )}
                      </div>
                    )}
                    {order.deliveryProofPhotoUrl && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-3">Photo</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={order.deliveryProofPhotoUrl}
                          alt="Preuve de livraison"
                          className="w-full rounded-3xl border border-gray-100 bg-[#faf8f1] object-cover"
                        />
                      </div>
                    )}
                    {order.deliverySignatureUrl && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-gray-400 mb-3">Signature</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={order.deliverySignatureUrl}
                          alt="Signature du destinataire"
                          className="w-full rounded-3xl border border-gray-100 bg-white object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
