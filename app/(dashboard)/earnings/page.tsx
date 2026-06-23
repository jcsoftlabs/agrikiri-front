'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LevelBadge from '@/components/mlm/LevelBadge';
import QuotaProgress from '@/components/mlm/QuotaProgress';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { useQuery } from '@tanstack/react-query';
import { getMyMLMStats, getMyCommissions } from '@/lib/services/mlm';
import { useAuthStore } from '@/store/authStore';



const TYPE_LABELS: Record<string, string> = {
  DIRECT: 'Commission directe',
  NETWORK: 'Commission réseau',
  MONTHLY_BONUS: 'Bonus mensuel',
  LEVEL_BONUS: 'Bonus de niveau',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  VALIDATED: 'bg-blue-50 text-blue-700 border-blue-200',
  PAID: 'bg-green-50 text-green-700 border-green-200',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  VALIDATED: 'Validé',
  PAID: 'Payé',
};

export default function EarningsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAyizan = user?.role === 'AYIZAN';

  useEffect(() => {
    if (user && user.role !== 'AYIZAN') {
      router.replace('/dashboard');
    }
  }, [router, user]);

  const { data: statsData } = useQuery({ queryKey: ['mlm-stats'], queryFn: getMyMLMStats, enabled: isAyizan });
  const { data: commissionsData, isLoading } = useQuery({ queryKey: ['mlm-commissions'], queryFn: getMyCommissions, enabled: isAyizan });

  const stats = statsData || {
    monthlyCommissions: 0,
    monthlyDirectCommissions: 0,
    monthlyNetworkCommissions: 0,
    monthlyBonus: 0,
    personalVP: 0,
    quotaVP: 546,
    currentLevel: undefined,
  };
  const commissions = commissionsData || [];

  const totalEarnings = commissions.reduce((sum, c) => sum + (c.status === 'PAID' || c.status === 'VALIDATED' ? Number(c.amount) : 0), 0);
  const pendingEarnings = commissions.reduce((sum, c) => sum + (c.status === 'PENDING' ? Number(c.amount) : 0), 0);
  const validatedEarnings = commissions.reduce((sum, c) => sum + (c.status === 'VALIDATED' ? Number(c.amount) : 0), 0);
  const paidEarnings = commissions.reduce((sum, c) => sum + (c.status === 'PAID' ? Number(c.amount) : 0), 0);
  const thisMonthEarnings = stats.monthlyCommissions || 0;
  const potentialMonthlyCommission = Number(stats.currentLevel?.monthlyCommission || 0);

  if (user && user.role !== 'AYIZAN') {
    return null;
  }

  return (
    <DashboardShell
      currentPath="/earnings"
      title="Mes Gains"
      subtitle="Consultez vos commissions, votre quota et l’historique complet de vos revenus MLM."
      headerAction={
        <Link href="/dashboard" className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-agri-green-300 hover:text-agri-green-700">
          ← Tableau de bord
        </Link>
      }
    >
      <div className="mb-8 overflow-hidden rounded-[30px] border border-white/20 bg-gradient-to-br from-agri-green-800 to-agri-green-600 shadow-[0_22px_70px_rgba(24,50,34,0.16)]">
        <div className="p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-white/60">Performance MLM</div>
          <div className="mt-3 text-5xl font-bold text-white font-display md:text-6xl">
            {totalEarnings.toLocaleString()}
            <span className="ml-2 text-2xl font-normal text-white/70">HTG</span>
          </div>
          <p className="mt-2 text-white/70">Commissions totales cumulées</p>
        </div>

        <div className="grid gap-px bg-white/10 sm:grid-cols-3">
          {[
            { label: 'Ce mois', value: `${Number(thisMonthEarnings).toLocaleString()} HTG` },
            { label: 'En attente', value: `${Number(pendingEarnings).toLocaleString()} HTG` },
            { label: 'Déjà payé', value: `${Number(paidEarnings).toLocaleString()} HTG` },
          ].map((item) => (
            <div key={item.label} className="bg-white/10 px-5 py-4 backdrop-blur-sm">
              <div className="text-xl font-bold text-white">{item.value}</div>
              <div className="mt-1 text-sm text-white/70">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 card overflow-hidden p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="font-display text-2xl text-agri-dark">Portefeuille commissions</h2>
              <p className="mt-1 text-sm text-gray-500">Vue simple des gains avant le futur module wallet/retrait.</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
              {[
                { label: 'Disponible bientôt', value: validatedEarnings, tone: 'bg-blue-50 text-blue-700 border-blue-100', help: 'Commissions validées, pas encore payées.' },
                { label: 'En attente', value: pendingEarnings, tone: 'bg-amber-50 text-amber-700 border-amber-100', help: 'À valider par le système/admin.' },
                { label: 'Payé', value: paidEarnings, tone: 'bg-green-50 text-green-700 border-green-100', help: 'Déjà marqué comme payé.' },
                { label: 'Total reconnu', value: totalEarnings, tone: 'bg-agri-green-50 text-agri-green-800 border-agri-green-100', help: 'Validé + payé.' },
              ].map((item) => (
                <div key={item.label} className={`rounded-[24px] border p-4 ${item.tone}`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{item.label}</div>
                  <div className="mt-3 text-2xl font-bold">{Number(item.value).toLocaleString()} HTG</div>
                  <p className="mt-2 text-xs leading-relaxed opacity-75">{item.help}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Direct ce mois', value: stats.monthlyDirectCommissions || 0 },
                  { label: 'Réseau ce mois', value: stats.monthlyNetworkCommissions || 0 },
                  { label: 'Bonus ce mois', value: stats.monthlyBonus || 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="text-sm font-semibold text-agri-dark">{Number(item.value).toLocaleString()} HTG</div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-6">
            <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-agri-dark mb-3">Quota Mensuel</h2>
              <QuotaProgress currentVP={stats.personalVP || 0} targetVP={stats.quotaVP || 546} />
            </div>
            <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-2">Votre niveau actuel</div>
              <LevelBadge level={user?.mlmLevel || 'CUSTOMER'} size="lg" showDescription />
            </div>
            <div className="rounded-[24px] bg-agri-green-50 p-4">
              <div className="text-sm text-agri-green-700 font-medium mb-1">Commission mensuelle potentielle</div>
              <div className="text-2xl font-bold text-agri-green-800">
                {potentialMonthlyCommission > 0 ? `${potentialMonthlyCommission.toLocaleString()} HTG` : 'Selon le grade'}
              </div>
              <div className="text-xs text-agri-green-600 mt-1">Si quota 546 VP atteint</div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-display text-2xl text-agri-dark">Détail des Commissions</h2>
              <p className="mt-1 text-sm text-gray-500">Retrouvez chaque gain, sa provenance et son état de paiement.</p>
            </div>
            <button
              disabled
              title="Export personnel à brancher avec le futur wallet."
              className="cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400"
            >
              Export bientôt
            </button>
          </div>

          <div className="space-y-4 lg:hidden">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="shimmer h-36 w-full rounded-2xl" />
              ))
            ) : commissions.length > 0 ? (
              commissions.map((commission, i) => (
                <div key={i} className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-gray-400">
                      {new Date(commission.createdAt).toLocaleDateString()}
                    </div>
                    <span className={`badge border ${STATUS_STYLES[commission.status] || 'bg-gray-50'}`}>
                      {STATUS_LABELS[commission.status] || commission.status}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Source</div>
                    <div className="rounded-2xl bg-gray-50 px-3 py-2 text-sm font-medium text-agri-dark break-all">
                      {commission.sourceUserId || 'Système'}
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Type</div>
                      <span className="badge bg-gray-50 text-gray-600 border border-gray-200">
                        {TYPE_LABELS[commission.type] || commission.type}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Montant</div>
                      <div className="font-bold text-agri-green-700">
                        +{Number(commission.amount).toLocaleString()} HTG
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">Aucune commission trouvée.</div>
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="table-agri">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">Chargement des commissions...</td>
                  </tr>
                ) : commissions.length > 0 ? (
                  commissions.map((commission, i) => (
                    <tr key={i}>
                      <td className="text-gray-400">{new Date(commission.createdAt).toLocaleDateString()}</td>
                      <td className="text-agri-dark font-medium max-w-[200px] truncate">{commission.sourceUserId || 'Système'}</td>
                      <td>
                        <span className="badge bg-gray-50 text-gray-600 border border-gray-200">
                          {TYPE_LABELS[commission.type] || commission.type}
                        </span>
                      </td>
                      <td className="font-bold text-agri-green-700">
                        +{Number(commission.amount).toLocaleString()} HTG
                      </td>
                      <td>
                        <span className={`badge border ${STATUS_STYLES[commission.status] || 'bg-gray-50'}`}>
                          {STATUS_LABELS[commission.status] || commission.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">Aucune commission trouvée.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </DashboardShell>
  );
}
