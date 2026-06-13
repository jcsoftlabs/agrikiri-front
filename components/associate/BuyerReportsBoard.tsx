'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { ACCOUNTING_CHANNEL_OPTIONS, getAccountingChannelLabel } from '@/lib/accounting-channels';
import {
  createBuyerAllocation,
  declineBuyerFundRequest,
  getBuyerBoardOverview,
  type BuyerAllocation,
  type BuyerFundRequest,
} from '@/lib/services/buyers';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const statusStyles = {
  PENDING_CONFIRMATION: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-blue-50 text-blue-700 border-blue-200',
  PARTIALLY_REPORTED: 'bg-purple-50 text-purple-700 border-purple-200',
  REPORTED: 'bg-agri-green-50 text-agri-green-700 border-agri-green-200',
};

const requestStatusLabels = {
  PENDING: 'En attente',
  ALLOCATED: 'Allocation préparée',
  FULFILLED: 'Décaissement validé',
  DECLINED: 'Refusée',
};

const requestStatusStyles = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  ALLOCATED: 'border-blue-200 bg-blue-50 text-blue-700',
  FULFILLED: 'border-agri-green-200 bg-agri-green-50 text-agri-green-700',
  DECLINED: 'border-red-200 bg-red-50 text-red-700',
};

function getAllocationStatusClass(allocation: BuyerAllocation) {
  if (allocation.status === 'PARTIALLY_REPORTED' && allocation.hasPendingAccountingValidation && allocation.remainingAmount <= 0) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }

  return statusStyles[allocation.status];
}

export default function BuyerReportsBoard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const canAllocate = user?.associateType === 'PDG';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allocationForm, setAllocationForm] = useState({
    buyerId: '',
    sourceDossierId: '',
    title: '',
    description: '',
    fundRequestId: '',
    amountAllocated: '',
    disbursementMethod: 'CASH',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['buyer-board-overview'],
    queryFn: getBuyerBoardOverview,
  });

  const createMutation = useMutation({
    mutationFn: createBuyerAllocation,
    onSuccess: () => {
      toast.success('Allocation envoyée à l’acheteur');
      setAllocationForm({
        buyerId: '',
        sourceDossierId: '',
        title: '',
        description: '',
        fundRequestId: '',
        amountAllocated: '',
        disbursementMethod: 'CASH',
      });
      queryClient.invalidateQueries({ queryKey: ['buyer-board-overview'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-dashboard'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible d’allouer ce montant'),
  });

  const declineMutation = useMutation({
    mutationFn: ({ requestId, reviewNote }: { requestId: string; reviewNote?: string }) =>
      declineBuyerFundRequest(requestId, reviewNote),
    onSuccess: () => {
      toast.success('Demande de fonds refusée');
      queryClient.invalidateQueries({ queryKey: ['buyer-board-overview'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-dashboard'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de refuser cette demande'),
  });

  const handleCreateAllocation = () => {
    if (!allocationForm.buyerId) {
      toast.error('Choisis un acheteur.');
      return;
    }

    if (allocationForm.title.trim().length < 3) {
      toast.error('Le libellé doit contenir au moins 3 caractères.');
      return;
    }

    const amountAllocated = Number(allocationForm.amountAllocated);
    if (!Number.isFinite(amountAllocated) || amountAllocated <= 0) {
      toast.error('Le montant doit être supérieur à 0.');
      return;
    }

    createMutation.mutate({
      buyerId: allocationForm.buyerId,
      sourceDossierId: allocationForm.sourceDossierId || undefined,
      title: allocationForm.title.trim(),
      description: allocationForm.description.trim() || undefined,
      fundRequestId: allocationForm.fundRequestId || undefined,
      amountAllocated,
      disbursementMethod: allocationForm.disbursementMethod as any,
    });
  };

  const allocations = data?.allocations || [];
  const buyers = data?.buyers || [];
  const overview = data?.overview;
  const fundRequests = data?.fundRequests || [];
  const approvedBudgets = data?.approvedBudgets || [];
  const pendingRequests = fundRequests.filter((request) => request.status === 'PENDING');
  const allocatedRequests = fundRequests.filter((request) => request.status === 'ALLOCATED');
  const selectedBudget = approvedBudgets.find((budget) => budget.id === allocationForm.sourceDossierId);
  const hasUnlinkedAllocations = (overview?.unlinkedAllocationsCount || 0) > 0;

  const prepareAllocationFromRequest = (request: BuyerFundRequest) => {
    setAllocationForm({
      buyerId: request.buyer.id,
      sourceDossierId: '',
      title: request.title,
      description: request.justification,
      fundRequestId: request.id,
      amountAllocated: String(request.amountRequested),
      disbursementMethod: 'CASH',
    });
    toast.success('Demande chargée dans le formulaire d’allocation');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {[
          { label: 'Acheteurs actifs', value: overview?.totalBuyers || 0, icon: '🧑🏾‍🌾' },
          { label: 'Montant alloué (global)', value: `${formatMoney(overview?.totalAllocated || 0)} HTG`, icon: '💼' },
          { label: 'Montant reporté (global)', value: `${formatMoney(overview?.totalReported || 0)} HTG`, icon: '📊' },
          { label: 'Montant restant (global)', value: `${formatMoney(overview?.totalRemaining || 0)} HTG`, icon: '📦' },
          { label: 'Budgets validés disponibles', value: `${formatMoney(overview?.approvedBudgetRemaining || 0)} HTG`, icon: '🏛️' },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(24,50,34,0.08)]">
            <div className="text-2xl">{item.icon}</div>
            <div className="mt-3 text-2xl font-bold text-agri-dark">{item.value}</div>
            <div className="mt-1 text-sm text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      {hasUnlinkedAllocations && (
        <div className="rounded-[26px] border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm text-amber-900 shadow-[0_10px_30px_rgba(120,79,0,0.08)]">
          <div className="font-semibold">Certaines allocations ne sont liées à aucune enveloppe approuvée.</div>
          <div className="mt-1">
            Hors enveloppe: <span className="font-semibold">{formatMoney(overview?.unlinkedAllocated || 0)} HTG</span>
            {' '}sur <span className="font-semibold">{overview?.unlinkedAllocationsCount || 0} allocation(s)</span>.
            {' '}Elles apparaissent dans les totaux globaux du haut, mais ne diminuent pas la carte d’un dossier approuvé.
          </div>
        </div>
      )}

      {canAllocate && (
        <div className="rounded-[30px] border border-agri-green-100 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-agri-green-50 px-3 py-1 text-xs font-bold text-agri-green-700">
              💸 ALLOCATION PDG
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-agri-dark">Allouer un budget à un acheteur</h3>
            <p className="mt-1 text-sm text-gray-500">
              Dès qu’un acheteur confirme la réception, il pourra détailler ses dépenses et les associés verront les rapports ici automatiquement.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Enveloppe dossier approuvée</label>
              <select
                className="input w-full"
                value={allocationForm.sourceDossierId}
                onChange={(event) => setAllocationForm((current) => ({ ...current, sourceDossierId: event.target.value }))}
              >
                <option value="">Aucune enveloppe liée</option>
                {approvedBudgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.title} · Disponible à engager {formatMoney(Math.max(0, budget.remainingAmount - budget.pendingAmount))} HTG
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Lie l’allocation à un dossier approuvé pour déduire ce montant de l’enveloppe disponible.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Acheteur</label>
              <select
                className="input w-full"
                value={allocationForm.buyerId}
                onChange={(event) => setAllocationForm((current) => ({ ...current, buyerId: event.target.value }))}
              >
                <option value="">Choisir un acheteur terrain</option>
                {buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.firstName} {buyer.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Montant alloué (HTG)</label>
              <input
                type="number"
                step="0.01"
                className="input w-full"
                placeholder="0.00"
                value={allocationForm.amountAllocated}
                onChange={(event) => setAllocationForm((current) => ({ ...current, amountAllocated: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Libellé</label>
              <input
                type="text"
                className="input w-full"
                placeholder="Ex: Mission achat riz Artibonite"
                value={allocationForm.title}
                onChange={(event) => setAllocationForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Note</label>
              <input
                type="text"
                className="input w-full"
                placeholder="Consignes, marchés ciblés, urgence..."
                value={allocationForm.description}
                onChange={(event) => setAllocationForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Moyen de transfert</label>
              <select
                className="input w-full"
                value={allocationForm.disbursementMethod}
                onChange={(event) => setAllocationForm((current) => ({ ...current, disbursementMethod: event.target.value }))}
              >
                {ACCOUNTING_CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedBudget && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: 'Approuvé', value: selectedBudget.approvedAmount },
                { label: 'Déjà alloué', value: selectedBudget.allocatedAmount },
                { label: 'Reste disponible', value: selectedBudget.remainingAmount },
              ].map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-agri-green-100 bg-agri-green-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-agri-green-700">{metric.label}</div>
                  <div className="mt-2 text-lg font-bold text-agri-dark">{formatMoney(metric.value)} HTG</div>
                </div>
              ))}
            </div>
          )}

          {!selectedBudget && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Aucune enveloppe sélectionnée. Si tu envoies cette allocation maintenant, elle comptera dans les totaux globaux,
              mais elle ne sera pas déduite d’un budget approuvé ci-dessous.
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={handleCreateAllocation} loading={createMutation.isPending}>
              Envoyer l’allocation
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-[30px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
            🏛️ ENVELOPPES APPROUVÉES
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-agri-dark">Budgets approuvés disponibles</h3>
          <p className="mt-1 text-sm text-gray-500">
            Un dossier approuvé représente un montant disponible, pas encore une dépense. Les allocations terrain viennent se déduire ici.
          </p>
          <p className="mt-2 text-xs font-medium text-gray-400">
            Cette section ne compte que les allocations explicitement liées à chaque enveloppe.
          </p>
        </div>

        {approvedBudgets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Aucun budget approuvé disponible pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {approvedBudgets.map((budget) => (
              <div key={budget.id} className="rounded-3xl border border-gray-100 bg-gray-50 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-agri-dark">{budget.title}</div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      {getAccountingChannelLabel(budget.disbursementMethod)} · {budget.linkedAllocationsCount} allocation(s) liée(s)
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Approuvé</div>
                      <div className="mt-1 font-semibold text-agri-dark">{formatMoney(budget.approvedAmount)} HTG</div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Validé compta</div>
                      <div className="mt-1 font-semibold text-agri-dark">{formatMoney(budget.allocatedAmount)} HTG</div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">En attente compta</div>
                      <div className="mt-1 font-semibold text-agri-dark">{formatMoney(budget.pendingAmount)} HTG</div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Disponible</div>
                      <div className="mt-1 font-semibold text-agri-dark">{formatMoney(budget.remainingAmount)} HTG</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {allocatedRequests.length > 0 && (
        <div className="rounded-[30px] border border-blue-100 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              ⏳ DEMANDES ALLOUÉES
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-agri-dark">Demandes en attente de validation comptable</h3>
            <p className="mt-1 text-sm text-gray-500">
              Le montant a été préparé, mais la dépense réelle n’est pas encore validée par la comptabilité.
            </p>
          </div>

          <div className="space-y-3">
            {allocatedRequests.map((request) => (
              <div key={request.id} className="rounded-3xl border border-blue-100 bg-blue-50/50 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-agri-dark">{request.title}</div>
                    <div className="mt-1 text-sm font-medium text-blue-700">
                      {request.buyer.firstName} {request.buyer.lastName}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{request.justification}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${requestStatusStyles[request.status]}`}>
                      {requestStatusLabels[request.status]}
                    </span>
                    <div className="text-xl font-bold text-agri-dark">{formatMoney(request.amountRequested)} HTG</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[30px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            📝 REQUETES ACHETEURS
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-agri-dark">Demandes de fonds des acheteurs</h3>
          <p className="mt-1 text-sm text-gray-500">
            Les acheteurs peuvent demander un nouveau montant. Le PDG peut préparer directement une allocation à partir d’une demande.
          </p>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Aucune requête de fonds en attente pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="rounded-3xl border border-gray-100 bg-gray-50 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-agri-dark">{request.title}</div>
                    <div className="mt-1 text-sm font-medium text-agri-green-700">
                      {request.buyer.firstName} {request.buyer.lastName}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{request.justification}</p>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Demandée le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <div className="text-xl font-bold text-agri-dark">{formatMoney(request.amountRequested)} HTG</div>
                    {canAllocate && (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => prepareAllocationFromRequest(request)}>
                          Préparer l’allocation
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          loading={declineMutation.isPending}
                          onClick={() => declineMutation.mutate({ requestId: request.id })}
                        >
                          Refuser
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, index) => <div key={index} className="shimmer h-48 rounded-3xl" />)
        ) : allocations.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-200 bg-white/85 px-6 py-12 text-center text-gray-500">
            Aucun rapport acheteur n’a encore été reçu.
          </div>
        ) : (
          allocations.map((allocation) => (
            <AllocationCard
              key={allocation.id}
              allocation={allocation}
              isExpanded={expandedId === allocation.id}
              onToggle={() => setExpandedId(expandedId === allocation.id ? null : allocation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AllocationCard({
  allocation,
  isExpanded,
  onToggle,
}: {
  allocation: BuyerAllocation;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
      <button type="button" onClick={onToggle} className="w-full px-5 py-5 text-left">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getAllocationStatusClass(allocation)}`}>
                {allocation.statusLabel}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                {allocation.buyer.firstName} {allocation.buyer.lastName}
              </span>
            </div>
            <h4 className="mt-3 text-2xl font-semibold text-agri-dark">{allocation.title}</h4>
            <p className="mt-2 text-sm text-gray-500">
              {allocation.description || 'Aucune note complémentaire.'}
            </p>
            <div className="mt-3 text-sm text-gray-500">
              Alloué le {new Date(allocation.createdAt).toLocaleDateString('fr-FR')} par{' '}
              <span className="font-semibold text-agri-dark">
                {allocation.allocatedBy.firstName} {allocation.allocatedBy.lastName}
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Moyen : <span className="font-semibold text-agri-dark">{getAccountingChannelLabel(allocation.disbursementMethod)}</span>
            </div>
            {allocation.sourceDossier && (
              <div className="mt-2 text-sm text-gray-500">
                Enveloppe source : <span className="font-semibold text-agri-dark">{allocation.sourceDossier.title}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[360px]">
            {[
              { label: 'Disponible', value: allocation.amountAllocated },
              { label: 'Dépensé', value: allocation.totalSpent },
              { label: 'Frais', value: allocation.totalFees },
              { label: 'Restant', value: allocation.remainingAmount },
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{metric.label}</div>
                <div className="mt-2 text-lg font-bold text-agri-dark">{formatMoney(metric.value)} HTG</div>
              </div>
            ))}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
          {allocation.reports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              Aucun rapport encore soumis pour cette allocation.
            </div>
          ) : (
            <div className="space-y-4">
                      {allocation.reports.map((report) => (
                        <div key={report.id} className="rounded-3xl border border-gray-100 bg-gray-50 px-4 py-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-agri-dark">
                                Rapport du {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                              </div>
                              <div className="mt-2">
                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                  report.accountingValidatedAt
                                    ? 'border-agri-green-200 bg-agri-green-50 text-agri-green-700'
                                    : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                }`}>
                                  {report.accountingValidatedAt ? 'Validé par la comptabilité' : 'En attente de validation comptable'}
                                </span>
                              </div>
                              {report.summary && <p className="mt-1 text-sm text-gray-500">{report.summary}</p>}
                            </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Dépensé</div>
                        <div className="mt-1 font-semibold text-agri-dark">{formatMoney(report.totalSpent)} HTG</div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Frais</div>
                        <div className="mt-1 font-semibold text-agri-dark">{formatMoney(report.totalFees)} HTG</div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Restant</div>
                        <div className="mt-1 font-semibold text-agri-dark">{formatMoney(report.remainingAmount)} HTG</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-[0.18em] text-gray-400">
                          <th className="pb-2 pr-4">Description</th>
                          <th className="pb-2 pr-4">Qté</th>
                          <th className="pb-2 pr-4">Prix unité</th>
                          <th className="pb-2 pr-4">Frais</th>
                          <th className="pb-2">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.lines.map((line) => (
                          <tr key={line.id} className="border-t border-gray-100 text-gray-600">
                            <td className="py-3 pr-4 font-medium text-agri-dark">{line.description}</td>
                            <td className="py-3 pr-4">{line.quantity}</td>
                            <td className="py-3 pr-4">{formatMoney(line.unitPrice)} HTG</td>
                            <td className="py-3 pr-4">{formatMoney(line.fees)} HTG</td>
                            <td className="py-3 font-semibold text-agri-dark">{formatMoney(line.lineAmount)} HTG</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
