'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LevelBadge from '@/components/mlm/LevelBadge';
import QuotaProgress from '@/components/mlm/QuotaProgress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  const { user, logout } = useAuthStore();
  const isAyizan = user?.role === 'AYIZAN';

  useEffect(() => {
    if (user && user.role !== 'AYIZAN') {
      router.replace('/dashboard');
    }
  }, [router, user]);

  const { data: statsData } = useQuery({ queryKey: ['mlm-stats'], queryFn: getMyMLMStats, enabled: isAyizan });
  const { data: commissionsData, isLoading } = useQuery({ queryKey: ['mlm-commissions'], queryFn: getMyCommissions, enabled: isAyizan });

  const stats = statsData || { monthlyCommissions: 0, personalVP: 0 };
  const commissions = commissionsData || [];

  const totalEarnings = commissions.reduce((sum, c) => sum + (c.status === 'PAID' || c.status === 'VALIDATED' ? Number(c.amount) : 0), 0);
  const pendingEarnings = commissions.reduce((sum, c) => sum + (c.status === 'PENDING' ? Number(c.amount) : 0), 0);
  const thisMonthEarnings = stats.monthlyCommissions || 0;

  if (user && user.role !== 'AYIZAN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-agri-cream">
      {/* Header */}
      <div className="bg-gradient-to-br from-agri-green-800 to-agri-green-600 pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Link href="/dashboard" className="text-white/70 hover:text-white text-sm">← Tableau de bord</Link>
            <button onClick={logout} className="text-white/70 hover:text-red-400 text-sm flex items-center gap-2 transition-colors">
              <span>↩</span> Déconnexion
            </button>
          </div>
          <h1 className="font-display text-4xl text-white mb-2">Mes Gains</h1>
          <p className="text-white/70">Histoique complet de vos commissions</p>

          {/* Gros total */}
          <div className="mt-8 text-center">
            <div className="text-6xl font-bold text-white font-display">
              {totalEarnings.toLocaleString()}
              <span className="text-2xl font-normal text-white/70 ml-2">HTG</span>
            </div>
            <p className="text-white/60 mt-2">Commissions totales cumulées</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {[
              { label: 'Ce mois', value: `${Number(thisMonthEarnings).toLocaleString()} HTG`, color: 'text-agri-gold-400' },
              { label: 'En attente', value: `${Number(pendingEarnings).toLocaleString()} HTG`, color: 'text-yellow-300' },
              { label: 'Déjà payé', value: `${Number(totalEarnings).toLocaleString()} HTG`, color: 'text-green-300' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-sm text-white/70 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bar chart */}
          <div className="lg:col-span-2 card p-6">
            <h2 className="font-semibold text-agri-dark mb-4">Historique mensuel</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()} HTG`, 'Commissions']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontFamily: 'DM Sans' }}
                />
                <Bar dataKey="total" fill="#2D7A2D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quota & Level */}
          <div className="card p-6 space-y-6">
            <div>
              <h2 className="font-semibold text-agri-dark mb-3">Quota Mensuel</h2>
              <QuotaProgress currentVP={stats.personalVP || 0} />
            </div>
            <div className="border-t border-gray-100 pt-4">
              <div className="text-sm text-gray-500 mb-2">Votre niveau actuel</div>
              <LevelBadge level={user?.mlmLevel || 'CUSTOMER'} size="lg" showDescription />
            </div>
            <div className="bg-agri-green-50 rounded-2xl p-4">
              <div className="text-sm text-agri-green-700 font-medium mb-1">Commission mensuelle potentielle</div>
              <div className="text-2xl font-bold text-agri-green-800">100,000 HTG</div>
              <div className="text-xs text-agri-green-600 mt-1">Si quota 546 VP atteint</div>
            </div>
          </div>
        </div>

        {/* Commission details table */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-agri-dark">Détail des Commissions</h2>
            <button className="text-sm text-agri-green-600 font-medium border border-agri-green-200 px-4 py-2 rounded-xl hover:bg-agri-green-50 transition-colors">
              📥 Exporter CSV
            </button>
          </div>

          <div className="space-y-4 lg:hidden">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="shimmer h-36 w-full rounded-2xl" />
              ))
            ) : commissions.length > 0 ? (
              commissions.map((commission, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
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
                    <div className="text-sm font-medium text-agri-dark break-all">{commission.sourceUserId || 'Système'}</div>
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
      </div>
    </div>
  );
}
