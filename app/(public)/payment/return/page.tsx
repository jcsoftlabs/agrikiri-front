'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { clearPendingPaymentSession, getPendingPaymentSession } from '@/lib/payment-session';
import { Order, getMyOrders, verifyOrderPayment } from '@/lib/services/orders';
import { useAuthStore } from '@/store/authStore';

type PaymentReturnState = 'loading' | 'success' | 'pending' | 'error' | 'missing';

const METHOD_LABELS: Record<string, string> = {
  PLOPPLOP: 'PLOP PLOP',
  MONCASH: 'MonCash',
  NATCASH: 'NatCash',
  KASHPAW: 'Kashpaw',
  CASH: 'Paiement à la livraison',
};

export default function PaymentReturnPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const [status, setStatus] = useState<PaymentReturnState>('loading');
  const [message, setMessage] = useState('Nous vérifions votre paiement en ce moment.');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!token && !isAuthenticated) {
      router.replace('/login?next=%2Fpayment%2Freturn');
      return;
    }

    if (token && !user && !isLoading) {
      void checkAuth();
    }
  }, [checkAuth, isAuthenticated, isLoading, router, token, user]);

  const activeOrderNumber = useMemo(() => {
    if (!activeOrder) return null;
    return activeOrder.orderNumber || `AGRO-${activeOrder.id.slice(0, 8)}`;
  }, [activeOrder]);

  const activePaymentMethodLabel = useMemo(() => {
    if (!activeOrder?.paymentMethod) return null;
    return METHOD_LABELS[activeOrder.paymentMethod] || activeOrder.paymentMethod;
  }, [activeOrder]);

  const resolvePayment = async (isManualRetry = false) => {
    if (!token || !user) return;

    if (isManualRetry) {
      setIsRetrying(true);
    }

    setStatus('loading');
    setMessage('Nous vérifions le statut de votre paiement.');

    try {
      const pendingSession = getPendingPaymentSession();
      const ordersData = await getMyOrders(1, 20);
      const candidateOrders = ordersData.orders || [];

      const targetOrder =
        (pendingSession?.orderId
          ? candidateOrders.find((order) => order.id === pendingSession.orderId)
          : null) ||
        candidateOrders.find((order) =>
          order.paymentMethod &&
          order.paymentMethod !== 'CASH' &&
          order.paymentStatus !== 'PAID'
        ) ||
        null;

      if (!targetOrder) {
        setActiveOrder(null);
        setStatus('missing');
        setMessage('Aucune commande en attente de confirmation n’a été trouvée.');
        clearPendingPaymentSession();
        return;
      }

      setActiveOrder(targetOrder);

      const verification = await verifyOrderPayment(targetOrder.id);
      setActiveOrder(verification.order);

      if (verification.payment.transactionStatus === 'PAID') {
        clearPendingPaymentSession(verification.order.id);
        setStatus('success');
        setMessage('Paiement confirmé. Votre commande a bien été enregistrée.');
        return;
      }

      setStatus('pending');
      setMessage(
        'Le paiement n’est pas encore confirmé. Il peut être en cours, abandonné ou expiré. Vous pouvez réessayer dans un instant.'
      );
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Impossible de vérifier le paiement pour le moment.');
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    if (!token || !user || isLoading || hasStartedRef.current) return;
    hasStartedRef.current = true;
    void resolvePayment();
  }, [isLoading, token, user]);

  const toneClasses = {
    loading: 'border-blue-100 bg-blue-50 text-blue-700',
    success: 'border-green-100 bg-green-50 text-green-700',
    pending: 'border-amber-100 bg-amber-50 text-amber-700',
    error: 'border-red-100 bg-red-50 text-red-700',
    missing: 'border-slate-200 bg-slate-50 text-slate-700',
  }[status];

  const title = {
    loading: 'Vérification du paiement',
    success: 'Paiement confirmé',
    pending: 'Paiement en attente',
    error: 'Vérification impossible',
    missing: 'Aucune commande à confirmer',
  }[status];

  return (
    <div className="min-h-screen bg-agri-cream flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-br from-agri-green-900 via-agri-green-800 to-agri-dark pt-24 pb-14">
        <div className="container-agri">
          <p className="text-white/70 text-sm uppercase tracking-[0.3em] mb-3">Retour de paiement</p>
          <h1 className="font-display text-4xl md:text-5xl text-white">Suivi de votre commande</h1>
          <p className="text-white/70 mt-3 max-w-2xl">
            Nous reprenons votre session de paiement pour vous indiquer clairement si la commande est confirmée, encore en attente, ou doit être revérifiée.
          </p>
        </div>
      </div>

      <main className="container-agri flex-1 py-10">
        <div className="max-w-4xl mx-auto grid gap-6 lg:grid-cols-[1.35fr_0.9fr] items-start">
          <section className="card p-8 border border-gray-100 shadow-sm">
            <div className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${toneClasses}`}>
              {title}
            </div>

            <h2 className="font-display text-3xl text-agri-dark mt-6 mb-3">
              {status === 'loading' ? 'Un instant, nous interrogeons le paiement.' : title}
            </h2>

            <p className="text-gray-600 leading-relaxed">
              {message}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {(status === 'pending' || status === 'error') && (
                <Button
                  variant="primary"
                  loading={isRetrying}
                  onClick={() => void resolvePayment(true)}
                >
                  Revérifier maintenant
                </Button>
              )}

              {activeOrder && (
                <Link href={`/orders/${activeOrder.id}`}>
                  <Button variant="secondary">Voir la commande</Button>
                </Link>
              )}

              <Link href="/orders">
                <Button variant="secondary">Mes commandes</Button>
              </Link>

              <Link href="/shop">
                <Button variant="ghost">Retour à la boutique</Button>
              </Link>
            </div>
          </section>

          <aside className="card p-6 border border-gray-100 shadow-sm space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 mb-2">Commande suivie</p>
              <p className="text-xl font-semibold text-agri-dark">
                {activeOrderNumber || 'En recherche...'}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl bg-agri-green-50 border border-agri-green-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-agri-green-700/70 mb-2">Montant</p>
                <p className="text-2xl font-bold text-agri-green-800">
                  {activeOrder ? `${activeOrder.totalAmount.toLocaleString()} HTG` : '...'}
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-gray-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 mb-2">Moyen de paiement</p>
                <p className="text-lg font-semibold text-agri-dark">
                  {activePaymentMethodLabel || 'En recherche...'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 leading-relaxed">
              {status === 'success' && 'Votre paiement a été confirmé. Vous pouvez maintenant suivre sereinement la préparation de la commande.'}
              {status === 'pending' && 'Si vous avez quitté le paiement trop tôt ou si la plateforme prend un peu de temps, cette commande peut rester en attente quelques minutes.'}
              {status === 'error' && 'En cas de doute, revérifiez une seconde fois puis consultez la commande pour voir si le statut a changé côté boutique.'}
              {status === 'missing' && 'Nous n’avons pas retrouvé de commande en ligne à reprendre. Vous pouvez consulter votre historique ou relancer un achat.'}
              {status === 'loading' && 'Le système compare votre dernière session de paiement avec vos commandes en attente pour reprendre exactement le bon dossier.'}
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
