'use client';

import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { getAdminStats } from '@/lib/services/admin';

const STATUS_STYLES: Record<string, string> = {
  DELIVERED: 'bg-green-50 text-green-700 border-green-200',
  SHIPPED: 'bg-blue-50 text-blue-700 border-blue-200',
  PROCESSING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PENDING: 'bg-gray-50 text-gray-600 border-gray-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  DELIVERED: 'Livré',
  SHIPPED: 'Expédié',
  PROCESSING: 'En cours',
  PENDING: 'En attente',
  CANCELLED: 'Annulé',
};

export default function AdminPage() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: getAdminStats,
  });

  const stats = dashboardData?.stats || {
    totalUsers: 0,
    totalAyizan: 0,
    totalOrders: 0,
    totalSales: 0,
    newUsersMonth: 0,
  };

  const recentOrders = dashboardData?.recentOrders || [];
  const topProducts = dashboardData?.topProducts || [];
  const salesHistory = dashboardData?.salesHistory || [];

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />

      {/* Main */}
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-agri-dark">Tableau de Bord Admin</h1>
          <p className="text-gray-500 mt-1">Vue d&apos;ensemble de la plateforme AGRIKIRI en temps réel</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total des ventes', value: `${stats.totalSales.toLocaleString()} HTG`, icon: '💵' },
            { label: 'Total Commandes', value: stats.totalOrders.toString(), icon: '🛒' },
            { label: 'Utilisateurs inscrits', value: stats.totalUsers.toString(), icon: '👥' },
            { label: 'Nouveaux (30j)', value: `+${stats.newUsersMonth}`, icon: '📈' },
          ].map((stat, i) => (
            <div key={i} className="stat-card border border-gray-100">
              <div className="flex justify-between items-start">
                <span className="text-2xl">{stat.icon}</span>
                {isLoading && <div className="shimmer h-4 w-8 rounded ml-auto" />}
              </div>
              <div className="text-2xl font-bold text-agri-dark mt-2">
                {isLoading ? <div className="shimmer h-8 w-24 rounded" /> : stat.value}
              </div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Chart Ventes */}
          <div className="lg:col-span-2 card p-6">
            <h2 className="font-semibold text-agri-dark mb-4 text-lg">Évolution des ventes (HTG)</h2>
            {isLoading ? (
              <div className="h-[220px] w-full shimmer rounded-2xl" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={salesHistory}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D7A2D" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2D7A2D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="ventes" stroke="#2D7A2D" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Products */}
          <div className="card p-6">
            <h2 className="font-semibold text-agri-dark mb-4 text-lg">📦 Top Produits</h2>
            <div className="space-y-5">
              {isLoading ? (
                [...Array(4)].map((_, i) => <div key={i} className="shimmer h-12 w-full rounded-xl" />)
              ) : topProducts.length > 0 ? (
                topProducts.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-agri-green-50 text-agri-green-700 flex items-center justify-center font-bold text-xs">
                        #{i + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-agri-green-700 transition-colors">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-agri-dark">{p.ventes}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic py-4 text-center">Aucune vente enregistrée</p>
              )}
            </div>
          </div>
        </div>

        {/* Dernières Commandes */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-agri-dark text-lg">Dernières Commandes</h2>
          </div>
          <div className="space-y-4 lg:hidden">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="shimmer h-32 w-full rounded-2xl" />
              ))
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order: any, i: number) => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs font-bold text-gray-600">{order.number}</div>
                      <div className="text-sm font-medium text-agri-dark mt-1">{order.customer}</div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[order.status] || ''}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Montant</div>
                      <div className="font-bold text-agri-green-700">{order.amount}</div>
                    </div>
                    <div className="text-sm text-gray-400">{order.date}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-400 italic">Aucune commande récente</div>
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="table-agri">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Client</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5}><div className="shimmer h-10 w-full rounded-lg" /></td>
                    </tr>
                  ))
                ) : recentOrders.length > 0 ? (
                  recentOrders.map((order: any, i: number) => (
                    <tr key={i}>
                      <td className="font-mono text-xs font-bold text-gray-600">{order.number}</td>
                      <td className="font-medium text-agri-dark">{order.customer}</td>
                      <td className="font-bold text-agri-green-700">{order.amount}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[order.status] || ''}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="text-gray-400 text-sm">{order.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-400 italic">Aucune commande récente</td>
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
