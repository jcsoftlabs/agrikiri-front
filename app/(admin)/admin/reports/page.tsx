'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminSidebar from '@/components/admin/AdminSidebar';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import Button from '@/components/ui/Button';
import { AdminReportsRange, exportAdminReports, getAdminReports } from '@/lib/services/admin';
import { getAdminProducts, getCategories } from '@/lib/services/products';

const RANGE_OPTIONS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  SHIPPED: 'Expédié',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
  PAID: 'Payé',
  FAILED: 'Échoué',
};

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  DIRECT: 'Directe',
  NETWORK: 'Réseau',
  MONTHLY_BONUS: 'Bonus mensuel',
  LEVEL_BONUS: 'Bonus niveau',
};

function getDeltaTone(direction: 'up' | 'down' | 'flat') {
  if (direction === 'up') return 'text-green-600 bg-green-50';
  if (direction === 'down') return 'text-red-600 bg-red-50';
  return 'text-gray-500 bg-gray-100';
}

function formatDelta(percent: number) {
  const prefix = percent > 0 ? '+' : '';
  return `${prefix}${percent.toFixed(1)}%`;
}

function getAlertTone(level: 'info' | 'warning' | 'success') {
  if (level === 'success') return 'bg-green-50 border-green-200 text-green-800';
  if (level === 'warning') return 'bg-amber-50 border-amber-200 text-amber-800';
  return 'bg-blue-50 border-blue-200 text-blue-800';
}

export default function AdminReportsPage() {
  const [range, setRange] = useState<AdminReportsRange>('30d');
  const [customDates, setCustomDates] = useState({ startDate: '', endDate: '' });
  const [isExporting, setIsExporting] = useState<'sales' | 'commissions' | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    categoryId: '',
    productId: '',
    orderStatus: '',
    paymentStatus: '',
  });
  const [expandedSection, setExpandedSection] = useState<'orders' | 'products' | 'commissions'>('orders');

  const { data: categories = [] } = useQuery({
    queryKey: ['report-categories'],
    queryFn: getCategories,
  });

  const { data: productsData } = useQuery({
    queryKey: ['report-products'],
    queryFn: () => getAdminProducts(),
  });

  const products = productsData?.products || [];
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', range, customDates.startDate, customDates.endDate, filters],
    queryFn: () =>
      getAdminReports(range, customDates.startDate || undefined, customDates.endDate || undefined, {
        categoryId: filters.categoryId || undefined,
        productId: filters.productId || undefined,
        orderStatus: filters.orderStatus || undefined,
        paymentStatus: filters.paymentStatus || undefined,
      }),
  });

  const overview = data?.overview;
  const comparison = data?.comparison;

  const handleExport = async (type: 'sales' | 'commissions') => {
    try {
      setIsExporting(type);
      const blob = await exportAdminReports(type, range, customDates.startDate || undefined, customDates.endDate || undefined, {
        categoryId: filters.categoryId || undefined,
        productId: filters.productId || undefined,
        orderStatus: filters.orderStatus || undefined,
        paymentStatus: filters.paymentStatus || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = type === 'sales' ? 'rapport-ventes.csv' : 'rapport-commissions.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = () => {
    if (!data || typeof window === 'undefined') return;

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) return;

    const alertHtml = data.alerts.map((alert) => `
      <div class="alert ${alert.level}">
        <div class="alert-title">${alert.title}</div>
        <div class="alert-body">${alert.message}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Rapport AGRIKIRI</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1f2937; }
            h1, h2 { margin: 0 0 8px; }
            .meta { color: #6b7280; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
            .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
            .label { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
            .value { font-size: 28px; font-weight: 700; color: #111827; }
            .sub { margin-top: 6px; color: #6b7280; font-size: 14px; }
            .section { margin-top: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            th { color: #6b7280; font-weight: 600; }
            .alerts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
            .alert { border-radius: 14px; padding: 14px; border: 1px solid #d1d5db; }
            .alert.success { background: #f0fdf4; border-color: #bbf7d0; }
            .alert.warning { background: #fffbeb; border-color: #fde68a; }
            .alert.info { background: #eff6ff; border-color: #bfdbfe; }
            .alert-title { font-weight: 700; margin-bottom: 6px; }
            .alert-body { font-size: 14px; color: #4b5563; }
          </style>
        </head>
        <body>
          <h1>Rapport AGRIKIRI</h1>
          <div class="meta">Période: ${data.period.label}</div>
          <div class="grid">
            <div class="card"><div class="label">Ventes payées</div><div class="value">${Math.round(data.overview.totalSales).toLocaleString()} HTG</div><div class="sub">${data.overview.totalOrders} commande(s)</div></div>
            <div class="card"><div class="label">Panier moyen</div><div class="value">${Math.round(data.overview.averageBasket).toLocaleString()} HTG</div><div class="sub">${data.overview.totalItemsSold} article(s) vendus</div></div>
            <div class="card"><div class="label">Nouveaux comptes</div><div class="value">${data.overview.newUsers}</div><div class="sub">${data.overview.newAyizan} nouveau(x) AYIZAN</div></div>
            <div class="card"><div class="label">Commissions</div><div class="value">${Math.round(data.commissions.total).toLocaleString()} HTG</div><div class="sub">${Math.round(data.commissions.paid).toLocaleString()} HTG payées</div></div>
          </div>
          ${alertHtml ? `<div class="alerts">${alertHtml}</div>` : ''}
          <div class="section">
            <h2>Commandes détaillées</h2>
            <table>
              <thead><tr><th>Commande</th><th>Client</th><th>Statut</th><th>Paiement</th><th>Montant</th></tr></thead>
              <tbody>
                ${data.details.orders.map((order) => `
                  <tr>
                    <td>${order.orderNumber}</td>
                    <td>${order.customer}</td>
                    <td>${STATUS_LABELS[order.status] || order.status}</td>
                    <td>${STATUS_LABELS[order.paymentStatus] || order.paymentStatus}</td>
                    <td>${Math.round(order.totalAmount).toLocaleString()} HTG</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="mb-8 border-b border-gray-100 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-3xl text-agri-dark">Rapports</h1>
              <p className="text-gray-500 mt-1">Vue consolidée des ventes, commandes, utilisateurs et commissions.</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
                    range === option.value
                      ? 'bg-agri-green-600 border-agri-green-500 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-agri-green-300 hover:text-agri-green-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRange('custom')}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
                  range === 'custom'
                    ? 'bg-agri-gold-400 border-agri-gold-400 text-agri-dark'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-agri-gold-300 hover:text-agri-dark'
                }`}
              >
                Personnalisé
              </button>
            </div>
          </div>
        </div>

        {range === 'custom' && (
          <div className="mb-6 rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Du</label>
                <input
                  type="date"
                  className="input"
                  value={customDates.startDate}
                  onChange={(e) => setCustomDates((current) => ({ ...current, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Au</label>
                <input
                  type="date"
                  className="input"
                  value={customDates.endDate}
                  onChange={(e) => setCustomDates((current) => ({ ...current, endDate: e.target.value }))}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCustomDates({ startDate: '', endDate: '' })}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        )}

        <div className="mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileFilters((current) => !current)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-agri-dark shadow-sm"
          >
            {showMobileFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          </button>
        </div>

        <div className={`mb-6 rounded-3xl bg-white border border-gray-100 p-5 shadow-sm ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catégorie</label>
              <select
                className="input"
                value={filters.categoryId}
                onChange={(e) => setFilters((current) => ({ ...current, categoryId: e.target.value, productId: '' }))}
              >
                <option value="">Toutes les catégories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Produit</label>
              <select
                className="input"
                value={filters.productId}
                onChange={(e) => setFilters((current) => ({ ...current, productId: e.target.value }))}
              >
                <option value="">Tous les produits</option>
                {products
                  .filter((product) => !filters.categoryId || product.categoryId === filters.categoryId)
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Statut commande</label>
              <select
                className="input"
                value={filters.orderStatus}
                onChange={(e) => setFilters((current) => ({ ...current, orderStatus: e.target.value }))}
              >
                <option value="">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="PROCESSING">En cours</option>
                <option value="SHIPPED">Expédié</option>
                <option value="DELIVERED">Livré</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Paiement</label>
              <select
                className="input"
                value={filters.paymentStatus}
                onChange={(e) => setFilters((current) => ({ ...current, paymentStatus: e.target.value }))}
              >
                <option value="">Tous les paiements</option>
                <option value="PENDING">En attente</option>
                <option value="PAID">Payé</option>
                <option value="FAILED">Échoué</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-6">
                  <div className="shimmer h-5 w-24 rounded mb-3" />
                  <div className="shimmer h-10 w-32 rounded mb-3" />
                  <div className="shimmer h-4 w-20 rounded" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card h-[320px] shimmer" />
              <div className="card h-[320px] shimmer" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm uppercase tracking-[0.18em] text-gray-400">Période analysée</div>
                  <div className="font-display text-2xl text-agri-dark mt-1">{data.period.label}</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <div className="text-sm text-gray-500">
                    Données ventes + MLM consolidées sur {range === 'custom' ? 'la période personnalisée' : RANGE_OPTIONS.find((option) => option.value === range)?.label.toLowerCase()}.
                  </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="primary"
                      size="sm"
                      onClick={handleExportPdf}
                    >
                      Export PDF
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={isExporting === 'sales'}
                      onClick={() => handleExport('sales')}
                    >
                      Export ventes CSV
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={isExporting === 'commissions'}
                      onClick={() => handleExport('commissions')}
                    >
                      Export commissions CSV
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                {
                  label: 'Ventes payées',
                  value: `${overview?.totalSales.toLocaleString()} HTG`,
                  meta: `${overview?.totalOrders} commande(s)`,
                  icon: '💵',
                  delta: comparison?.totalSales,
                },
                {
                  label: 'Panier moyen',
                  value: `${Math.round(overview?.averageBasket || 0).toLocaleString()} HTG`,
                  meta: `${overview?.totalItemsSold} article(s) vendus`,
                  icon: '🧺',
                  delta: comparison?.averageBasket,
                },
                {
                  label: 'Nouveaux comptes',
                  value: String(overview?.newUsers || 0),
                  meta: `${overview?.newAyizan || 0} nouveaux AYIZAN`,
                  icon: '👥',
                  delta: comparison?.newAyizan,
                },
                {
                  label: 'Taux livré',
                  value: `${(overview?.conversionRate || 0).toFixed(1)}%`,
                  meta: `${overview?.deliveredOrders || 0} livrées / ${overview?.pendingOrders || 0} en attente`,
                  icon: '📦',
                  delta: comparison?.totalOrders,
                },
              ].map((item) => (
                <div key={item.label} className="card p-6 border border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-2xl">{item.icon}</div>
                    <span className="text-xs font-semibold text-agri-green-600 bg-agri-green-50 px-2 py-1 rounded-full">
                      {range === 'custom' ? 'Personnalisé' : RANGE_OPTIONS.find((option) => option.value === range)?.label}
                    </span>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">{item.label}</div>
                  <div className="mt-1 text-3xl font-bold text-agri-dark">{item.value}</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-400">{item.meta}</div>
                    {item.delta && (
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getDeltaTone(item.delta.direction)}`}>
                        {formatDelta(item.delta.percent)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {data.alerts.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {data.alerts.map((alert, index) => (
                  <div key={`${alert.title}-${index}`} className={`rounded-3xl border p-5 ${getAlertTone(alert.level)}`}>
                    <div className="font-semibold">{alert.title}</div>
                    <div className="text-sm mt-2 leading-relaxed opacity-90">{alert.message}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-agri-dark text-lg">Évolution des ventes</h2>
                  <p className="text-sm text-gray-500 mt-1">Montants payés sur la période courante.</p>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.salesHistory}>
                    <defs>
                      <linearGradient id="reportsSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2D7A2D" stopOpacity={0.24} />
                        <stop offset="95%" stopColor="#2D7A2D" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2e7" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <Tooltip formatter={(value: number, name: string) => [Number(value).toLocaleString(), name === 'ventes' ? 'Ventes (HTG)' : 'Commandes']} />
                    <Area type="monotone" dataKey="ventes" stroke="#2D7A2D" fill="url(#reportsSales)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-agri-dark text-lg">Comparaison graphique double période</h2>
                  <p className="text-sm text-gray-500 mt-1">Courbe actuelle vs période précédente équivalente.</p>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.comparisonHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2e7" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        Number(value).toLocaleString(),
                        name === 'currentSales' ? 'Période actuelle (HTG)' : 'Période précédente (HTG)',
                      ]}
                    />
                    <Line type="monotone" dataKey="currentSales" stroke="#2D7A2D" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="previousSales" stroke="#D4AF37" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-4 lg:hidden">
              <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-agri-dark mb-4">Top produits</h3>
                <div className="space-y-3">
                  {data.topProducts.slice(0, 5).map((product, index) => (
                    <div key={product.productId} className="rounded-2xl bg-agri-cream border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-gray-400">#{index + 1}</div>
                          <div className="font-semibold text-agri-dark mt-1">{product.name}</div>
                          <div className="text-sm text-gray-500 mt-1">{product.quantity} unité(s)</div>
                        </div>
                        <div className="text-sm font-bold text-agri-green-700">
                          {Math.round(product.amount).toLocaleString()} HTG
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-agri-dark mb-4">Statuts commandes</h3>
                <div className="space-y-3">
                  {data.ordersByStatus.map((item) => (
                    <div key={item.status} className="rounded-2xl bg-agri-cream border border-gray-100 p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-agri-dark">{STATUS_LABELS[item.status] || item.status}</div>
                        <div className="text-sm text-gray-500 mt-1">{item.count} commande(s)</div>
                      </div>
                      <div className="text-lg font-bold text-agri-green-700">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-agri-dark text-lg">Répartition des commandes</h2>
                  <p className="text-sm text-gray-500 mt-1">Statuts logistiques et paiements observés.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-agri-cream border border-gray-100 p-4">
                    <div className="text-sm font-semibold text-agri-dark mb-3">Par livraison</div>
                    <div className="space-y-3">
                      {data.ordersByStatus.map((item) => (
                        <div key={item.status} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{STATUS_LABELS[item.status] || item.status}</span>
                          <span className="font-bold text-agri-dark">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-agri-cream border border-gray-100 p-4">
                    <div className="text-sm font-semibold text-agri-dark mb-3">Par paiement</div>
                    <div className="space-y-3">
                      {data.paymentsByStatus.map((item) => (
                        <div key={item.status} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{STATUS_LABELS[item.status] || item.status}</span>
                          <span className="font-bold text-agri-dark">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-agri-dark text-lg">Produits les plus vendus</h2>
                  <p className="text-sm text-gray-500 mt-1">Top produits par quantité sur la période.</p>
                </div>
                <div className="space-y-4">
                  {data.topProducts.length > 0 ? data.topProducts.map((product, index) => (
                    <div key={product.productId} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-agri-green-50 text-agri-green-700 flex items-center justify-center text-sm font-bold">
                          #{index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-agri-dark truncate">{product.name}</div>
                          <div className="text-xs text-gray-400">{product.quantity} unité(s)</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-agri-dark">{Math.round(product.amount).toLocaleString()} HTG</div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 italic">Aucune vente sur cette période.</p>
                  )}
                </div>
              </div>

              <div className="card p-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-agri-dark text-lg">Catégories les plus actives</h2>
                  <p className="text-sm text-gray-500 mt-1">Montant vendu par famille de produits.</p>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.topCategories}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2e7" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <Tooltip formatter={(value: number) => [`${Math.round(Number(value)).toLocaleString()} HTG`, 'Montant']} />
                    <Bar dataKey="amount" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="card p-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-agri-dark text-lg">Résumé des commissions</h2>
                  <p className="text-sm text-gray-500 mt-1">Ce que le réseau a généré sur la période sélectionnée.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                  <div className="rounded-2xl border border-gray-100 bg-agri-green-50 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-agri-green-700/60 mb-2">Total</div>
                    <div className="text-2xl font-bold text-agri-dark">{Math.round(data.commissions.total).toLocaleString()} HTG</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-gray-400 mb-2">Payé</div>
                    <div className="text-2xl font-bold text-agri-dark">{Math.round(data.commissions.paid).toLocaleString()} HTG</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-gray-400 mb-2">En attente</div>
                    <div className="text-2xl font-bold text-agri-dark">{Math.round(data.commissions.pending).toLocaleString()} HTG</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.commissions.byType.map((item) => (
                    <div key={item.type} className="flex items-center justify-between text-sm border-b border-gray-100 pb-3">
                      <span className="text-gray-600">{COMMISSION_TYPE_LABELS[item.type] || item.type}</span>
                      <span className="font-bold text-agri-dark">{Math.round(item.amount).toLocaleString()} HTG</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-agri-dark text-lg">Comparaison rapide</h2>
                  <p className="text-sm text-gray-500 mt-1">Écart avec la période précédente équivalente.</p>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="rounded-2xl bg-agri-cream border border-gray-100 p-4">
                    <div className="font-semibold text-agri-dark mb-1">Ventes payées</div>
                    <div className="text-gray-500">
                      Période précédente :{' '}
                      <strong className="text-agri-dark">{Math.round(comparison?.totalSales.previous || 0).toLocaleString()} HTG</strong>.
                      {' '}Écart : <strong className={comparison?.totalSales.direction === 'down' ? 'text-red-600' : 'text-green-600'}>
                        {Math.round(comparison?.totalSales.diff || 0).toLocaleString()} HTG
                      </strong>.
                    </div>
                  </div>
                  <div className="rounded-2xl bg-agri-cream border border-gray-100 p-4">
                    <div className="font-semibold text-agri-dark mb-1">Commande moyenne</div>
                    <div className="text-gray-500">
                      Période précédente :{' '}
                      <strong className="text-agri-dark">{Math.round(comparison?.averageBasket.previous || 0).toLocaleString()} HTG</strong>.
                      {' '}Variation : <strong className={comparison?.averageBasket.direction === 'down' ? 'text-red-600' : 'text-green-600'}>
                        {formatDelta(comparison?.averageBasket.percent || 0)}
                      </strong>.
                    </div>
                  </div>
                  <div className="rounded-2xl bg-agri-cream border border-gray-100 p-4">
                    <div className="font-semibold text-agri-dark mb-1">Commissions réseau</div>
                    <div className="text-gray-500">
                      Période précédente :{' '}
                      <strong className="text-agri-dark">{Math.round(comparison?.totalCommissions.previous || 0).toLocaleString()} HTG</strong>.
                      {' '}Variation : <strong className={comparison?.totalCommissions.direction === 'down' ? 'text-red-600' : 'text-green-600'}>
                        {formatDelta(comparison?.totalCommissions.percent || 0)}
                      </strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-agri-dark text-lg">Vues détaillées</h2>
                  <p className="text-sm text-gray-500 mt-1">Explore les données détaillées sans quitter le module.</p>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {[
                    { key: 'orders', label: 'Commandes' },
                    { key: 'products', label: 'Produits' },
                    { key: 'commissions', label: 'Commissions' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setExpandedSection(item.key as 'orders' | 'products' | 'commissions')}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold border ${
                        expandedSection === item.key
                          ? 'bg-agri-green-600 border-agri-green-500 text-white'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {expandedSection === 'orders' && (
                <div className="overflow-x-auto hidden lg:block">
                  <table className="table-agri">
                    <thead>
                      <tr>
                        <th>Commande</th>
                        <th>Client</th>
                        <th>Statut</th>
                        <th>Paiement</th>
                        <th>Articles</th>
                        <th>Montant</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.details.orders.map((order) => (
                        <tr key={order.id}>
                          <td className="font-mono text-xs font-bold text-gray-600">{order.orderNumber}</td>
                          <td>{order.customer}</td>
                          <td>{STATUS_LABELS[order.status] || order.status}</td>
                          <td>{STATUS_LABELS[order.paymentStatus] || order.paymentStatus}</td>
                          <td>{order.itemCount}</td>
                          <td className="font-semibold text-agri-dark">{Math.round(order.totalAmount).toLocaleString()} HTG</td>
                          <td>{new Date(order.createdAt).toLocaleDateString('fr-HT')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {expandedSection === 'orders' && (
                <div className="space-y-3 lg:hidden">
                  {data.details.orders.map((order) => (
                    <div key={order.id} className="rounded-2xl bg-agri-cream border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-xs font-bold text-gray-500">{order.orderNumber}</div>
                          <div className="mt-1 font-semibold text-agri-dark">{order.customer}</div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-bold text-agri-dark">{Math.round(order.totalAmount).toLocaleString()} HTG</div>
                          <div className="text-gray-400 mt-1">{new Date(order.createdAt).toLocaleDateString('fr-HT')}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div><span className="text-gray-400 block">Statut</span><span className="font-medium text-agri-dark">{STATUS_LABELS[order.status] || order.status}</span></div>
                        <div><span className="text-gray-400 block">Paiement</span><span className="font-medium text-agri-dark">{STATUS_LABELS[order.paymentStatus] || order.paymentStatus}</span></div>
                        <div><span className="text-gray-400 block">Articles</span><span className="font-medium text-agri-dark">{order.itemCount}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expandedSection === 'products' && (
                <div className="overflow-x-auto hidden lg:block">
                  <table className="table-agri">
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Quantité</th>
                        <th>Montant</th>
                        <th>Prix moyen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.details.products.map((product) => (
                        <tr key={product.productId}>
                          <td className="font-medium text-agri-dark">{product.name}</td>
                          <td>{product.quantity}</td>
                          <td className="font-semibold text-agri-dark">{Math.round(product.amount).toLocaleString()} HTG</td>
                          <td>{Math.round(product.averagePrice).toLocaleString()} HTG</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {expandedSection === 'products' && (
                <div className="space-y-3 lg:hidden">
                  {data.details.products.map((product) => (
                    <div key={product.productId} className="rounded-2xl bg-agri-cream border border-gray-100 p-4">
                      <div className="font-semibold text-agri-dark">{product.name}</div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div><span className="text-gray-400 block">Quantité</span><span className="font-medium text-agri-dark">{product.quantity}</span></div>
                        <div><span className="text-gray-400 block">Montant</span><span className="font-medium text-agri-dark">{Math.round(product.amount).toLocaleString()} HTG</span></div>
                        <div><span className="text-gray-400 block">Prix moyen</span><span className="font-medium text-agri-dark">{Math.round(product.averagePrice).toLocaleString()} HTG</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expandedSection === 'commissions' && (
                <div className="overflow-x-auto hidden lg:block">
                  <table className="table-agri">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>AYIZAN</th>
                        <th>Source</th>
                        <th>Type</th>
                        <th>Statut</th>
                        <th>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.details.commissions.map((commission) => (
                        <tr key={commission.id}>
                          <td>{new Date(commission.createdAt).toLocaleDateString('fr-HT')}</td>
                          <td className="font-medium text-agri-dark">{commission.ayizanName}</td>
                          <td>{commission.sourceName}</td>
                          <td>{COMMISSION_TYPE_LABELS[commission.type] || commission.type}</td>
                          <td>{commission.status}</td>
                          <td className="font-semibold text-agri-dark">{Math.round(commission.amount).toLocaleString()} HTG</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {expandedSection === 'commissions' && (
                <div className="space-y-3 lg:hidden">
                  {data.details.commissions.map((commission) => (
                    <div key={commission.id} className="rounded-2xl bg-agri-cream border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-agri-dark">{commission.ayizanName}</div>
                          <div className="text-sm text-gray-500 mt-1">{commission.sourceName}</div>
                        </div>
                        <div className="text-sm font-bold text-agri-dark">{Math.round(commission.amount).toLocaleString()} HTG</div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div><span className="text-gray-400 block">Type</span><span className="font-medium text-agri-dark">{COMMISSION_TYPE_LABELS[commission.type] || commission.type}</span></div>
                        <div><span className="text-gray-400 block">Statut</span><span className="font-medium text-agri-dark">{commission.status}</span></div>
                        <div><span className="text-gray-400 block">Date</span><span className="font-medium text-agri-dark">{new Date(commission.createdAt).toLocaleDateString('fr-HT')}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
