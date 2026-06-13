'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Button from '@/components/ui/Button';
import {
  AccountingRange,
  closeAccountingPeriod,
  createManualAccountingInflow,
  downloadAccountingJournal,
  getAccountingDashboard,
  markAccountingDossierExecuted,
  reconcileAccountingCashOrder,
  validateAccountingOutflow,
} from '@/lib/services/accounting';
import toast from 'react-hot-toast';

const RANGE_OPTIONS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
] as const;

const ACCOUNTING_CHANNEL_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MONCASH', label: 'MonCash' },
  { value: 'NATCASH', label: 'NatCash' },
  { value: 'PLOPPLOP', label: 'PLOP PLOP' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT_BANCAIRE', label: 'Virement bancaire' },
  { value: 'KASHPAW', label: 'Kashpaw' },
  { value: 'AUTRE', label: 'Autre' },
] as const;

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('fr-FR')} HTG`;
}

function formatShortDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-HT', { day: 'numeric', month: 'short' });
}

function getDeltaTone(direction: 'up' | 'down' | 'flat', inverse = false) {
  if (direction === 'flat') return 'bg-gray-100 text-gray-600';
  if (inverse) {
    return direction === 'down' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700';
  }
  return direction === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700';
}

function formatDelta(percent: number) {
  const prefix = percent > 0 ? '+' : '';
  return `${prefix}${percent.toFixed(1)}%`;
}

function getAlertTone(level: 'info' | 'warning' | 'success') {
  if (level === 'success') return 'bg-green-50 border-green-200 text-green-900';
  if (level === 'warning') return 'bg-amber-50 border-amber-200 text-amber-900';
  return 'bg-blue-50 border-blue-200 text-blue-900';
}

function MetricCard({
  title,
  value,
  subtitle,
  delta,
  inverseDelta = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  delta: { percent: number; direction: 'up' | 'down' | 'flat' };
  inverseDelta?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{title}</p>
          <p className="mt-3 font-display text-3xl text-agri-dark">{value}</p>
          <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(delta.direction, inverseDelta)}`}>
          {formatDelta(delta.percent)}
        </span>
      </div>
    </div>
  );
}

export default function AccountingDashboardPage() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<AccountingRange>('30d');
  const [customDates, setCustomDates] = useState({ startDate: '', endDate: '' });
  const [closureNote, setClosureNote] = useState('');
  const [manualInflowForm, setManualInflowForm] = useState({
    title: '',
    amount: '',
    channel: 'VIREMENT_BANCAIRE' as (typeof ACCOUNTING_CHANNEL_OPTIONS)[number]['value'],
    occurredAt: new Date().toISOString().slice(0, 16),
    category: '',
    counterparty: '',
    reference: '',
    note: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['accounting-dashboard', range, customDates.startDate, customDates.endDate],
    queryFn: () => getAccountingDashboard(range, customDates.startDate || undefined, customDates.endDate || undefined),
  });

  const refreshDashboard = () =>
    queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });

  const reconcileMutation = useMutation({
    mutationFn: reconcileAccountingCashOrder,
    onSuccess: () => {
      toast.success('Commande rapprochée');
      refreshDashboard();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de rapprocher cette commande'),
  });

  const validateOutflowMutation = useMutation({
    mutationFn: validateAccountingOutflow,
    onSuccess: () => {
      toast.success('Sortie validée');
      refreshDashboard();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de valider cette sortie'),
  });

  const markExecutedMutation = useMutation({
    mutationFn: markAccountingDossierExecuted,
    onSuccess: () => {
      toast.success('Dossier pointé comme exécuté');
      refreshDashboard();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de pointer ce dossier'),
  });

  const closePeriodMutation = useMutation({
    mutationFn: () =>
      closeAccountingPeriod({
        range,
        startDate: customDates.startDate || undefined,
        endDate: customDates.endDate || undefined,
        note: closureNote.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Période clôturée');
      setClosureNote('');
      refreshDashboard();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de clôturer cette période'),
  });

  const manualInflowMutation = useMutation({
    mutationFn: () =>
      createManualAccountingInflow({
        title: manualInflowForm.title,
        amount: Number(manualInflowForm.amount),
        channel: manualInflowForm.channel,
        occurredAt: new Date(manualInflowForm.occurredAt).toISOString(),
        category: manualInflowForm.category || undefined,
        counterparty: manualInflowForm.counterparty || undefined,
        reference: manualInflowForm.reference || undefined,
        note: manualInflowForm.note || undefined,
      }),
    onSuccess: () => {
      toast.success('Entrée comptable enregistrée');
      setManualInflowForm({
        title: '',
        amount: '',
        channel: 'VIREMENT_BANCAIRE',
        occurredAt: new Date().toISOString().slice(0, 16),
        category: '',
        counterparty: '',
        reference: '',
        note: '',
      });
      refreshDashboard();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible d’enregistrer cette entrée'),
  });

  const handleExportJournal = async () => {
    try {
      await downloadAccountingJournal(range, customDates.startDate || undefined, customDates.endDate || undefined);
      toast.success('Journal exporté');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible d’exporter le journal');
    }
  };

  const handleManualInflowSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    manualInflowMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />

      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="mb-8 border-b border-gray-100 pb-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 border border-cyan-200">
                Comptabilité AGRIKIRI
              </span>
              <h1 className="mt-3 font-display text-3xl text-agri-dark">Trésorerie, encaissements et rapprochement</h1>
              <p className="mt-2 text-gray-500 max-w-3xl">
                Vue comptable consolidée des ventes online, du POS, des avances acheteurs, des frais terrain et des
                encaissements à rapprocher.
              </p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <Button type="button" variant="secondary" size="sm" onClick={handleExportJournal}>
                Exporter journal
              </Button>
              <Button type="button" variant="primary" size="sm" loading={closePeriodMutation.isPending} onClick={() => closePeriodMutation.mutate()}>
                Clôturer la période
              </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Note de clôture</label>
              <input
                type="text"
                className="input"
                placeholder="Optionnel : précision sur la période, anomalies, remarques..."
                value={closureNote}
                onChange={(e) => setClosureNote(e.target.value)}
              />
            </div>
          </div>
        )}

        <section className="mb-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-display text-2xl text-agri-dark">Entrée de fonds hors vente</h2>
              <p className="text-sm text-gray-500 mt-1">
                Enregistre ici une rentrée comptable qui ne vient pas d’une commande ou d’une vente POS, comme la vente d’un moulin.
              </p>
            </div>
            <div className="rounded-2xl bg-cyan-50 border border-cyan-100 px-4 py-3 text-sm text-cyan-900">
              Cette entrée ira directement dans les <span className="font-semibold">Entrées</span>, le <span className="font-semibold">journal</span> et les <span className="font-semibold">mouvements récents</span>.
            </div>
          </div>

          <form className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2" onSubmit={handleManualInflowSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Libellé</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Vente d’un moulin"
                value={manualInflowForm.title}
                onChange={(e) => setManualInflowForm((current) => ({ ...current, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Montant (HTG)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input"
                placeholder="0.00"
                value={manualInflowForm.amount}
                onChange={(e) => setManualInflowForm((current) => ({ ...current, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Moyen</label>
              <select
                className="input"
                value={manualInflowForm.channel}
                onChange={(e) =>
                  setManualInflowForm((current) => ({
                    ...current,
                    channel: e.target.value as (typeof ACCOUNTING_CHANNEL_OPTIONS)[number]['value'],
                  }))
                }
              >
                {ACCOUNTING_CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date et heure</label>
              <input
                type="datetime-local"
                className="input"
                value={manualInflowForm.occurredAt}
                onChange={(e) => setManualInflowForm((current) => ({ ...current, occurredAt: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catégorie</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Vente équipement"
                value={manualInflowForm.category}
                onChange={(e) => setManualInflowForm((current) => ({ ...current, category: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contrepartie</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Nom de l’acheteur du moulin"
                value={manualInflowForm.counterparty}
                onChange={(e) => setManualInflowForm((current) => ({ ...current, counterparty: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Référence</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Vente Moulin 01"
                value={manualInflowForm.reference}
                onChange={(e) => setManualInflowForm((current) => ({ ...current, reference: e.target.value }))}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Note</label>
              <textarea
                className="input min-h-[110px]"
                placeholder="Contexte comptable, précision sur l’origine des fonds..."
                value={manualInflowForm.note}
                onChange={(e) => setManualInflowForm((current) => ({ ...current, note: e.target.value }))}
              />
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={manualInflowMutation.isPending}
                disabled={!manualInflowForm.title || !manualInflowForm.amount || !manualInflowForm.occurredAt}
              >
                Enregistrer la rentrée
              </Button>
            </div>
          </form>
        </section>

        {isLoading || !data ? (
          <div className="rounded-3xl bg-white border border-gray-100 p-10 text-center shadow-sm">
            <div className="w-12 h-12 border-4 border-agri-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Chargement du dashboard comptabilité...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                title="Entrées"
                value={formatCurrency(data.overview.totalInflows)}
                subtitle={`Période ${data.period.label}`}
                delta={data.comparison.inflows}
              />
              <MetricCard
                title="Sorties"
                value={formatCurrency(data.overview.totalOutflows)}
                subtitle="Sorties réellement exécutées"
                delta={data.comparison.outflows}
                inverseDelta
              />
              <MetricCard
                title="Net de trésorerie"
                value={formatCurrency(data.overview.netTreasury)}
                subtitle="Encaissements moins sorties directes"
                delta={data.comparison.netTreasury}
              />
              <MetricCard
                title="Avances à justifier"
                value={formatCurrency(data.reconciliation.openAllocationBalance)}
                subtitle={`${data.reconciliation.openAllocationCount ?? 0} allocation(s) encore ouverte(s) à solder`}
                delta={data.comparison.buyerAllocated}
                inverseDelta
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h2 className="font-display text-2xl text-agri-dark">Flux de trésorerie</h2>
                    <p className="text-sm text-gray-500 mt-1">Entrées, sorties et net comptable visibles jour par jour.</p>
                  </div>
                  <span className="rounded-full bg-agri-green-50 px-3 py-1 text-xs font-semibold text-agri-green-700 border border-agri-green-200">
                    {data.period.label}
                  </span>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.cashflow}>
                      <defs>
                        <linearGradient id="inflowFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2f855a" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#2f855a" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="outflowFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `Jour: ${label}`}
                        contentStyle={{ borderRadius: 16, borderColor: '#e5e7eb' }}
                      />
                      <Area type="monotone" dataKey="inflows" stroke="#2f855a" fill="url(#inflowFill)" strokeWidth={3} />
                      <Area type="monotone" dataKey="outflows" stroke="#d97706" fill="url(#outflowFill)" strokeWidth={3} />
                      <Area type="monotone" dataKey="net" stroke="#1a365d" fill="transparent" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-display text-2xl text-agri-dark">Alertes comptables</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">Les points qui méritent une revue immédiate.</p>
                <div className="space-y-3">
                  {data.alerts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                      Aucun signal critique pour cette période.
                    </div>
                  ) : (
                    data.alerts.map((alert, index) => (
                      <div key={`${alert.title}-${index}`} className={`rounded-2xl border p-4 ${getAlertTone(alert.level)}`}>
                        <p className="font-semibold">{alert.title}</p>
                        <p className="mt-1 text-sm opacity-90">{alert.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-display text-2xl text-agri-dark">Budgets approuvés</h2>
              <p className="text-sm text-gray-500 mt-1 mb-5">
                Un dossier validé crée une enveloppe disponible. Les allocations terrain viennent la consommer ensuite, sans être confondues avec une sortie immédiate.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-2xl bg-cyan-50 border border-cyan-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Approuvé</p>
                  <p className="mt-3 text-2xl font-display text-cyan-900">{formatCurrency(data.budgetEnvelopes.totalApproved)}</p>
                  <p className="mt-1 text-sm text-cyan-800">Enveloppes validées côté associés</p>
                </div>
                <div className="rounded-2xl bg-agri-green-50 border border-agri-green-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-agri-green-700">Déjà alloué</p>
                  <p className="mt-3 text-2xl font-display text-agri-green-900">{formatCurrency(data.budgetEnvelopes.totalAllocated)}</p>
                  <p className="mt-1 text-sm text-agri-green-800">Montant déjà ventilé vers le terrain</p>
                </div>
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Reste disponible</p>
                  <p className="mt-3 text-2xl font-display text-amber-900">{formatCurrency(data.budgetEnvelopes.totalRemaining)}</p>
                  <p className="mt-1 text-sm text-amber-800">{data.budgetEnvelopes.pendingExecutionCount} dossier(s) encore non pointé(s) exécuté(s)</p>
                </div>
                <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 sm:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">En attente de validation comptable</p>
                  <p className="mt-3 text-2xl font-display text-indigo-900">{formatCurrency(data.budgetEnvelopes.totalPending)}</p>
                  <p className="mt-1 text-sm text-indigo-800">Montants approuvés côté PDG mais pas encore déduits en comptabilité</p>
                </div>
              </div>
              <div className="space-y-3">
                {data.budgetEnvelopes.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                    Aucun budget approuvé sur cette période.
                  </div>
                ) : (
                  data.budgetEnvelopes.items.slice(0, 6).map((budget) => (
                    <div key={budget.id} className="rounded-2xl border border-gray-100 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold text-agri-dark">{budget.title}</p>
                          <p className="text-xs text-agri-green-700 mt-2 font-semibold">{budget.method}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {budget.linkedAllocationsCount} allocation(s) liée(s) · {formatShortDate(budget.createdAt)}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Approuvé</div>
                            <div className="mt-1 font-semibold text-agri-dark">{formatCurrency(budget.approvedAmount)}</div>
                          </div>
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Alloué</div>
                            <div className="mt-1 font-semibold text-agri-dark">{formatCurrency(budget.allocatedAmount)}</div>
                          </div>
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">En attente</div>
                            <div className="mt-1 font-semibold text-agri-dark">{formatCurrency(budget.pendingAmount)}</div>
                          </div>
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Reste</div>
                            <div className="mt-1 font-semibold text-agri-dark">{formatCurrency(budget.remainingAmount)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-display text-2xl text-agri-dark">Encaissements</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">Ce qui entre réellement dans le système.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                  <div className="rounded-2xl bg-agri-green-50 border border-agri-green-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-agri-green-700">Online</p>
                    <p className="mt-3 text-2xl font-display text-agri-green-900">{formatCurrency(data.collections.online)}</p>
                    <p className="mt-1 text-sm text-agri-green-800">{data.collections.paidOrdersCount} commande(s) payée(s)</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">POS</p>
                    <p className="mt-3 text-2xl font-display text-emerald-900">{formatCurrency(data.collections.pos)}</p>
                    <p className="mt-1 text-sm text-emerald-800">{data.collections.completedPosSalesCount} vente(s) finalisée(s)</p>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 border border-cyan-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Entrées manuelles</p>
                    <p className="mt-3 text-2xl font-display text-cyan-900">{formatCurrency(data.collections.manual)}</p>
                    <p className="mt-1 text-sm text-cyan-800">Rentrées hors commandes et hors POS</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Livreurs</p>
                    <p className="mt-3 text-2xl font-display text-blue-900">{formatCurrency(data.collections.deliveryCashCollected)}</p>
                    <p className="mt-1 text-sm text-blue-800">Cash terrain déclaré sur la période</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Entrées par moyen</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {data.collections.byMethod.map((item) => (
                      <div key={item.method} className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 border border-gray-100 text-sm">
                        <span className="font-medium text-agri-dark">{item.label}</span>
                        <span className="font-semibold text-agri-dark">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { label: 'Online', value: data.collections.online },
                        { label: 'POS', value: data.collections.pos },
                        { label: 'Manuel', value: data.collections.manual },
                        { label: 'Livreurs', value: data.collections.deliveryCashCollected },
                      ]}
                    >
                      <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 16, borderColor: '#e5e7eb' }} />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#2f855a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-display text-2xl text-agri-dark">Décaissements</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">Les sorties réelles, distinctes des budgets simplement approuvés.</p>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-agri-dark">Allocations acheteurs</p>
                      <p className="text-sm text-gray-500">Avances réellement sorties de caisse vers le terrain</p>
                    </div>
                    <p className="font-display text-2xl text-agri-dark">{formatCurrency(data.disbursements.buyerAllocated)}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-agri-dark">Rapports acheteurs</p>
                      <p className="text-sm text-gray-500">Montant déjà justifié, frais inclus</p>
                    </div>
                    <p className="font-display text-2xl text-agri-dark">{formatCurrency(data.disbursements.buyerReported)}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-agri-dark">Frais terrain livreurs</p>
                      <p className="text-sm text-gray-500">Sorties signalées dans les rapports terrain</p>
                    </div>
                    <p className="font-display text-2xl text-agri-dark">{formatCurrency(data.disbursements.deliveryFieldExpenses)}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Demandes de fonds ouvertes</p>
                      <p className="text-sm text-amber-800">{data.disbursements.pendingFundRequestsCount} demande(s) en attente</p>
                    </div>
                    <p className="font-display text-2xl text-amber-900">{formatCurrency(data.disbursements.pendingFundRequestsAmount)}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Sorties par moyen</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {data.disbursements.byMethod.map((item) => (
                      <div key={item.method} className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 border border-gray-100 text-sm">
                        <span className="font-medium text-agri-dark">{item.label}</span>
                        <span className="font-semibold text-agri-dark">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-display text-2xl text-agri-dark">Rapprochement prioritaire</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">Les zones où la compta doit fermer l’écart.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Cash livré non rapproché</p>
                    <p className="mt-3 text-2xl font-display text-red-900">{formatCurrency(data.reconciliation.pendingCodAmount)}</p>
                    <p className="mt-1 text-sm text-red-800">{data.reconciliation.pendingCodCount} commande(s)</p>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 border border-cyan-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Bons en transit</p>
                    <p className="mt-3 text-2xl font-display text-cyan-900">{data.reconciliation.inTransitDeliveryNotes}</p>
                    <p className="mt-1 text-sm text-cyan-800">Bon(s) encore en circulation</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Allocations à confirmer</p>
                    <p className="mt-3 text-2xl font-display text-amber-900">{data.reconciliation.pendingAllocationConfirmations}</p>
                    <p className="mt-1 text-sm text-amber-800">Attente de confirmation terrain</p>
                  </div>
                  <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Encours acheteurs</p>
                    <p className="mt-3 text-2xl font-display text-indigo-900">{formatCurrency(data.reconciliation.openAllocationBalance)}</p>
                    <p className="mt-1 text-sm text-indigo-800">Montant encore ouvert</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-display text-2xl text-agri-dark">Demandes de fonds en attente</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">Les sollicitations acheteurs qui appellent une décision.</p>
                <div className="space-y-3">
                  {data.pendingFundRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                      Aucune demande de fonds en attente sur cette période.
                    </div>
                  ) : (
                    data.pendingFundRequests.map((request) => (
                      <div key={request.id} className="rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-agri-dark">{request.title}</p>
                          <p className="text-sm text-gray-500 mt-1">{request.buyer}</p>
                          <p className="text-xs text-gray-400 mt-2">Demandé le {formatShortDate(request.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-xl text-agri-dark">{formatCurrency(request.amountRequested)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-display text-2xl text-agri-dark">Valider une sortie</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">Les dépenses qui attendent encore la validation comptable.</p>
                <div className="space-y-3">
                  {data.pendingBuyerAllocations.map((allocation) => (
                    <div key={allocation.id} className="rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-agri-dark">{allocation.title}</p>
                        <p className="text-sm text-gray-500 mt-1">{allocation.buyer}</p>
                        <p className="text-xs text-agri-green-700 mt-2 font-semibold">{allocation.method}</p>
                        <p className="text-xs text-gray-400 mt-2">{formatShortDate(allocation.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl text-agri-dark">{formatCurrency(allocation.amount)}</p>
                        <div className="mt-3">
                          <Button type="button" size="sm" variant="secondary" loading={validateOutflowMutation.isPending} onClick={() => validateOutflowMutation.mutate({ type: 'BUYER_ALLOCATION', id: allocation.id })}>
                            Confirmer la dépense réelle
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.pendingBuyerReports.map((report) => (
                    <div key={report.id} className="rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-agri-dark">{report.title}</p>
                        <p className="text-sm text-gray-500 mt-1">{report.buyer}</p>
                        <p className="text-xs text-gray-400 mt-2">{formatShortDate(report.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl text-agri-dark">{formatCurrency(report.amount)}</p>
                        <div className="mt-3">
                          <Button type="button" size="sm" variant="secondary" loading={validateOutflowMutation.isPending} onClick={() => validateOutflowMutation.mutate({ type: 'BUYER_REPORT', id: report.id })}>
                            Valider une sortie
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.pendingDeliveryExpenses.map((report) => (
                    <div key={report.id} className="rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-agri-dark">{report.title}</p>
                        <p className="text-sm text-gray-500 mt-1">{report.deliveryAgent}</p>
                        <p className="text-xs text-agri-green-700 mt-2 font-semibold">{report.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl text-agri-dark">{formatCurrency(report.amount)}</p>
                        <div className="mt-3">
                          <Button type="button" size="sm" variant="secondary" loading={validateOutflowMutation.isPending} onClick={() => validateOutflowMutation.mutate({ type: 'DELIVERY_REPORT', id: report.id })}>
                            Valider une sortie
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.pendingBuyerAllocations.length === 0 && data.pendingBuyerReports.length === 0 && data.pendingDeliveryExpenses.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                      Aucune sortie en attente de validation.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-display text-2xl text-agri-dark">Commandes cash à clôturer</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">Commandes livrées dont le cash n’est pas encore rapproché.</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.2em] text-gray-400">
                        <th className="pb-3 font-semibold">Commande</th>
                        <th className="pb-3 font-semibold">Client</th>
                        <th className="pb-3 font-semibold">Livrée</th>
                        <th className="pb-3 font-semibold text-right">Montant</th>
                        <th className="pb-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pendingCashOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-sm text-gray-500">Aucune commande cash non rapprochée.</td>
                        </tr>
                      ) : (
                        data.pendingCashOrders.map((order) => (
                          <tr key={order.id} className="border-t border-gray-100 text-sm">
                            <td className="py-3 font-semibold text-agri-dark">{order.orderNumber}</td>
                            <td className="py-3 text-gray-600">{order.customer}</td>
                            <td className="py-3 text-gray-500">{formatShortDate(order.deliveredAt)}</td>
                            <td className="py-3 text-right font-semibold text-agri-dark">{formatCurrency(order.amount)}</td>
                            <td className="py-3 text-right">
                              <Button type="button" size="sm" variant="secondary" loading={reconcileMutation.isPending} onClick={() => reconcileMutation.mutate(order.id)}>
                                Marquer comme rapproché
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-display text-2xl text-agri-dark">Pointer les dossiers exécutés</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">Les dossiers approuvés qui ont réellement quitté la caisse.</p>
                <div className="space-y-3">
                  {data.pendingDossierExecutions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                      Aucun dossier approuvé en attente d’exécution.
                    </div>
                  ) : (
                    data.pendingDossierExecutions.map((dossier) => (
                      <div key={dossier.id} className="rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-agri-dark">{dossier.title}</p>
                          <p className="text-xs text-agri-green-700 mt-2 font-semibold">{dossier.method}</p>
                          <p className="text-xs text-gray-400 mt-2">{formatShortDate(dossier.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-xl text-agri-dark">{formatCurrency(dossier.amount)}</p>
                          <div className="mt-3">
                            <Button type="button" size="sm" variant="secondary" loading={markExecutedMutation.isPending} onClick={() => markExecutedMutation.mutate(dossier.id)}>
                              Pointer les dossiers exécutés
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-display text-2xl text-agri-dark">Mouvements récents</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">Les dernières opérations qui impactent la lecture comptable.</p>
                <div className="space-y-3">
                  {data.recentOperations.map((operation) => (
                    <div key={operation.id} className="rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{operation.type}</p>
                        <p className="mt-2 font-semibold text-agri-dark">{operation.label}</p>
                        <p className="text-sm text-gray-500 mt-1">{operation.counterparty}</p>
                        <p className="text-xs text-agri-green-700 mt-2 font-semibold">{operation.method}</p>
                        <p className="text-xs text-gray-400 mt-2">{formatShortDate(operation.createdAt)}</p>
                      </div>
                      <p className="font-display text-xl text-agri-dark">{formatCurrency(operation.amount)}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-display text-2xl text-agri-dark">Clôtures récentes</h2>
                <p className="text-sm text-gray-500 mt-1 mb-5">Les périodes déjà clôturées par la comptabilité.</p>
                <div className="space-y-3">
                  {data.recentClosures.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                      Aucune clôture enregistrée pour le moment.
                    </div>
                  ) : (
                    data.recentClosures.map((closure) => (
                      <div key={closure.id} className="rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-agri-dark">{closure.rangeLabel}</p>
                            <p className="text-xs text-gray-400 mt-2">Clôturé le {formatShortDate(closure.createdAt)}</p>
                            {closure.note && <p className="text-sm text-gray-500 mt-2">{closure.note}</p>}
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-semibold text-agri-dark">Entrées {formatCurrency(closure.totalInflows)}</p>
                            <p className="font-semibold text-agri-dark mt-1">Sorties {formatCurrency(closure.totalOutflows)}</p>
                            <p className="font-display text-lg text-agri-dark mt-2">Net {formatCurrency(closure.netTreasury)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
