'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import BuyerStockShipments from '@/components/buyer/BuyerStockShipments';
import { getAccountingChannelLabel } from '@/lib/accounting-channels';
import {
  confirmBuyerAllocation,
  createBuyerFundRequest,
  getBuyerDashboard,
  submitBuyerExpenseReport,
  type BuyerAllocation,
} from '@/lib/services/buyers';

type ReportLineForm = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  fees: string;
};

type ReportFormState = {
  summary: string;
  lines: ReportLineForm[];
};

function createEmptyLine(): ReportLineForm {
  return {
    id: Math.random().toString(36).slice(2, 10),
    description: '',
    quantity: '',
    unitPrice: '',
    fees: '',
  };
}

function createEmptyReportForm(): ReportFormState {
  return {
    summary: '',
    lines: [createEmptyLine()],
  };
}

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
  PENDING: 'En attente de décision',
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

export default function BuyerDashboard() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, ReportFormState>>({});
  const [fundRequestForm, setFundRequestForm] = useState({
    title: '',
    amountRequested: '',
    justification: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['buyer-dashboard'],
    queryFn: getBuyerDashboard,
  });

  const confirmMutation = useMutation({
    mutationFn: confirmBuyerAllocation,
    onSuccess: () => {
      toast.success('Réception confirmée');
      queryClient.invalidateQueries({ queryKey: ['buyer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-board-overview'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible de confirmer la réception'),
  });

  const reportMutation = useMutation({
    mutationFn: ({ allocationId, payload }: { allocationId: string; payload: any }) =>
      submitBuyerExpenseReport(allocationId, payload),
    onSuccess: (_, variables) => {
      toast.success('Rapport de dépenses envoyé');
      setForms((current) => ({
        ...current,
        [variables.allocationId]: createEmptyReportForm(),
      }));
      queryClient.invalidateQueries({ queryKey: ['buyer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-board-overview'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible d’envoyer le rapport'),
  });

  const fundRequestMutation = useMutation({
    mutationFn: createBuyerFundRequest,
    onSuccess: () => {
      toast.success('Demande de fonds envoyée');
      setFundRequestForm({ title: '', amountRequested: '', justification: '' });
      queryClient.invalidateQueries({ queryKey: ['buyer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-board-overview'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Impossible d’envoyer la demande de fonds'),
  });

  const allocations = data?.allocations || [];
  const overview = data?.overview;
  const fundRequests = data?.fundRequests || [];

  const handleSubmitFundRequest = () => {
    const amountRequested = Number(fundRequestForm.amountRequested);

    if (fundRequestForm.title.trim().length < 3) {
      toast.error('Donne un titre clair à la demande.');
      return;
    }

    if (!Number.isFinite(amountRequested) || amountRequested <= 0) {
      toast.error('Le montant demandé doit être valide.');
      return;
    }

    if (fundRequestForm.justification.trim().length < 20) {
      toast.error('Explique un peu mieux pourquoi tu demandes ces fonds.');
      return;
    }

    fundRequestMutation.mutate({
      title: fundRequestForm.title.trim(),
      amountRequested,
      justification: fundRequestForm.justification.trim(),
    });
  };

  const getFormState = (allocationId: string) => forms[allocationId] || createEmptyReportForm();

  const setFormState = (allocationId: string, updater: (current: ReportFormState) => ReportFormState) => {
    setForms((current) => ({
      ...current,
      [allocationId]: updater(current[allocationId] || createEmptyReportForm()),
    }));
  };

  const updateLine = (allocationId: string, lineId: string, field: keyof ReportLineForm, value: string) => {
    setFormState(allocationId, (current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              [field]:
                field === 'description'
                  ? value
                  : value.replace(/[^\d.]/g, ''),
            }
          : line
      ),
    }));
  };

  const addLine = (allocationId: string) => {
    setFormState(allocationId, (current) => ({
      ...current,
      lines: [...current.lines, createEmptyLine()],
    }));
  };

  const removeLine = (allocationId: string, lineId: string) => {
    setFormState(allocationId, (current) => ({
      ...current,
      lines:
        current.lines.length > 1
          ? current.lines.filter((line) => line.id !== lineId)
          : [createEmptyLine()],
    }));
  };

  const handleSubmitReport = (allocation: BuyerAllocation) => {
    const form = getFormState(allocation.id);
    const preparedLines = form.lines
      .filter((line) => line.description.trim() || line.quantity.trim() || line.unitPrice.trim() || line.fees.trim())
      .map((line) => ({
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        fees: Number(line.fees || '0'),
      }));

    if (preparedLines.length === 0) {
      toast.error('Ajoute au moins une ligne de dépense.');
      return;
    }

    const invalidLine = preparedLines.some(
      (line) => !line.description || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0 || !Number.isFinite(line.fees) || line.fees < 0
    );

    if (invalidLine) {
      toast.error('Chaque ligne doit avoir une description, une quantité et un prix valides.');
      return;
    }

    reportMutation.mutate({
      allocationId: allocation.id,
      payload: {
        summary: form.summary.trim() || undefined,
        lines: preparedLines,
      },
    });
  };

  if (isLoading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="shimmer h-40 rounded-3xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <BuyerStockShipments />

      <div className="rounded-[30px] border border-agri-green-100 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-agri-green-50 px-3 py-1 text-xs font-bold text-agri-green-700">
              💸 REQUETE DE FONDS
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-agri-dark">Demander un nouveau montant</h3>
            <p className="mt-1 text-sm text-gray-500">
              Cette demande apparaîtra automatiquement dans le dashboard associés pour que le PDG puisse la traiter.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Demandes en attente</div>
            <div className="mt-1 text-xl font-bold text-agri-dark">
              {fundRequests.filter((request) => request.status === 'PENDING').length}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Titre</label>
            <input
              type="text"
              className="input w-full"
              placeholder="Ex: Réapprovisionnement marché de Gros-Morne"
              value={fundRequestForm.title}
              onChange={(event) => setFundRequestForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Montant demandé (HTG)</label>
            <input
              type="number"
              step="0.01"
              className="input w-full"
              placeholder="0.00"
              value={fundRequestForm.amountRequested}
              onChange={(event) => setFundRequestForm((current) => ({ ...current, amountRequested: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Justification</label>
            <textarea
              className="input min-h-[120px] w-full"
              placeholder="Explique le besoin, la zone d’achat, les produits visés et l’urgence."
              value={fundRequestForm.justification}
              onChange={(event) => setFundRequestForm((current) => ({ ...current, justification: event.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSubmitFundRequest} loading={fundRequestMutation.isPending}>
            Envoyer la requête
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Montant alloué', value: `${formatMoney(overview?.totalAllocated || 0)} HTG`, tone: 'text-agri-green-700', icon: '💼' },
          { label: 'Montant dépensé', value: `${formatMoney(overview?.totalSpent || 0)} HTG`, tone: 'text-blue-700', icon: '🛒' },
          { label: 'Frais déclarés', value: `${formatMoney(overview?.totalFees || 0)} HTG`, tone: 'text-amber-700', icon: '🧾' },
          { label: 'Montant restant', value: `${formatMoney(overview?.totalRemaining || 0)} HTG`, tone: 'text-purple-700', icon: '📦' },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(24,50,34,0.08)]">
            <div className="text-2xl">{item.icon}</div>
            <div className={`mt-3 text-2xl font-bold ${item.tone}`}>{item.value}</div>
            <div className="mt-1 text-sm text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      {fundRequests.length > 0 && (
        <div className="rounded-[30px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-agri-dark">Mes requêtes de fonds</h3>
              <p className="mt-1 text-sm text-gray-500">Historique de tes demandes envoyées au board.</p>
            </div>
          </div>

          <div className="space-y-3">
            {fundRequests.map((request) => (
              <div key={request.id} className="rounded-3xl border border-gray-100 bg-gray-50 px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-agri-dark">{request.title}</div>
                    <p className="mt-1 text-sm text-gray-500">{request.justification}</p>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Demandée le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${requestStatusStyles[request.status]}`}>
                      {requestStatusLabels[request.status]}
                    </span>
                    <div className="text-lg font-bold text-agri-dark">{formatMoney(request.amountRequested)} HTG</div>
                  </div>
                </div>
                {request.reviewNote && (
                  <div className="mt-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600">
                    <span className="font-semibold text-agri-dark">Note du board :</span> {request.reviewNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {allocations.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-gray-200 bg-white/85 px-6 py-12 text-center text-gray-500">
          Aucune allocation n’a encore été envoyée à cet acheteur.
        </div>
      ) : (
        allocations.map((allocation) => {
          const isExpanded = expandedId === allocation.id;
          const form = getFormState(allocation.id);
          const previewRows = form.lines.map((line) => ({
            ...line,
            quantityNumber: Number(line.quantity || 0),
            unitPriceNumber: Number(line.unitPrice || 0),
            feesNumber: Number(line.fees || 0),
          }));

          const previewComputed = previewRows.map((line, index) => {
            const spent = line.quantityNumber * line.unitPriceNumber;
            const previousReported = previewRows
              .slice(0, index)
              .reduce((sum, current) => sum + current.quantityNumber * current.unitPriceNumber + current.feesNumber, 0);
            const available = Math.max(0, allocation.remainingAmount - previousReported);
            const lineReported = spent + line.feesNumber;
            const remaining = Math.max(0, available - lineReported);

            return {
              available,
              spent,
              remaining,
            };
          });

          return (
            <div key={allocation.id} className="rounded-[30px] border border-white/70 bg-white/92 shadow-[0_18px_60px_rgba(24,50,34,0.08)] overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : allocation.id)}
                className="w-full px-5 py-5 text-left"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getAllocationStatusClass(allocation)}`}>
                        {allocation.statusLabel}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Alloué le {new Date(allocation.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-agri-dark">{allocation.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm text-gray-500">
                      {allocation.description || 'Allocation terrain sans note complémentaire.'}
                    </p>
                    <div className="mt-3 text-sm text-gray-500">
                      Envoyé par <span className="font-semibold text-agri-dark">{allocation.allocatedBy.firstName} {allocation.allocatedBy.lastName}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Moyen prévu : <span className="font-semibold text-agri-dark">{getAccountingChannelLabel(allocation.disbursementMethod)}</span>
                    </div>
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
                  {allocation.status === 'PENDING_CONFIRMATION' && (
                    <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-amber-100 bg-amber-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="font-semibold text-amber-800">Confirme la réception du montant</div>
                        <div className="text-sm text-amber-700">
                          Tant que tu ne confirmes pas, aucun rapport de dépenses ne peut être envoyé.
                        </div>
                      </div>
                      <Button
                        onClick={() => confirmMutation.mutate(allocation.id)}
                        loading={confirmMutation.isPending}
                      >
                        J’ai bien reçu ce montant
                      </Button>
                    </div>
                  )}

                  {allocation.reports.length > 0 && (
                    <div className="mb-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-agri-dark">Rapports déjà envoyés</h4>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                          {allocation.reports.length} rapport(s)
                        </span>
                      </div>
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
                              <div className="rounded-2xl bg-white px-3 py-2 border border-gray-100">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Dépensé</div>
                                <div className="mt-1 font-semibold text-agri-dark">{formatMoney(report.totalSpent)} HTG</div>
                              </div>
                              <div className="rounded-2xl bg-white px-3 py-2 border border-gray-100">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Frais</div>
                                <div className="mt-1 font-semibold text-agri-dark">{formatMoney(report.totalFees)} HTG</div>
                              </div>
                              <div className="rounded-2xl bg-white px-3 py-2 border border-gray-100">
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

                  {allocation.status !== 'PENDING_CONFIRMATION' && allocation.remainingAmount > 0 && (
                    <div className="rounded-3xl border border-agri-green-100 bg-agri-green-50/40 p-4">
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-agri-dark">Nouveau rapport de dépenses</h4>
                        <p className="mt-1 text-sm text-gray-500">
                          Déclare chaque achat et chaque frais pour que le montant restant se mette à jour proprement.
                        </p>
                      </div>

                      <textarea
                        className="input min-h-[100px] w-full"
                        placeholder="Résumé rapide du déplacement, marché visité, contexte des achats..."
                        value={form.summary}
                        onChange={(event) =>
                          setFormState(allocation.id, (current) => ({
                            ...current,
                            summary: event.target.value,
                          }))
                        }
                      />

                      <div className="mt-4 overflow-x-auto rounded-3xl border border-gray-100 bg-white">
                        <table className="min-w-[980px] w-full text-sm">
                          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                            <tr>
                              <th className="px-4 py-3">Description</th>
                              <th className="px-4 py-3">Quantité</th>
                              <th className="px-4 py-3">Prix unité</th>
                              <th className="px-4 py-3">Montant disponible</th>
                              <th className="px-4 py-3">Montant dépensé</th>
                              <th className="px-4 py-3">Montant restant</th>
                              <th className="px-4 py-3">Frais</th>
                              <th className="px-4 py-3">Ligne</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.lines.map((line, index) => (
                              <tr key={line.id} className="border-t border-gray-100 align-top">
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    className="input !min-h-0"
                                    placeholder="Ex: Achat riz local"
                                    value={line.description}
                                    onChange={(event) => updateLine(allocation.id, line.id, 'description', event.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="input !min-h-0"
                                    placeholder="0"
                                    value={line.quantity}
                                    onChange={(event) => updateLine(allocation.id, line.id, 'quantity', event.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="input !min-h-0"
                                    placeholder="0.00"
                                    value={line.unitPrice}
                                    onChange={(event) => updateLine(allocation.id, line.id, 'unitPrice', event.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-3 font-semibold text-agri-dark">
                                  {formatMoney(previewComputed[index]?.available || 0)} HTG
                                </td>
                                <td className="px-4 py-3 font-semibold text-agri-dark">
                                  {formatMoney(previewComputed[index]?.spent || 0)} HTG
                                </td>
                                <td className="px-4 py-3 font-semibold text-agri-dark">
                                  {formatMoney(previewComputed[index]?.remaining || 0)} HTG
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="input !min-h-0"
                                    placeholder="0.00"
                                    value={line.fees}
                                    onChange={(event) => updateLine(allocation.id, line.id, 'fees', event.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => removeLine(allocation.id, line.id)}
                                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                  >
                                    Retirer
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <button
                          type="button"
                          onClick={() => addLine(allocation.id)}
                          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-agri-green-700 shadow-sm ring-1 ring-agri-green-100 transition hover:bg-agri-green-50"
                        >
                          + Ajouter une ligne
                        </button>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="rounded-2xl border border-white/80 bg-white px-4 py-3 text-sm">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Disponible actuel</div>
                            <div className="mt-1 font-bold text-agri-dark">{formatMoney(allocation.remainingAmount)} HTG</div>
                          </div>
                          <Button
                            onClick={() => handleSubmitReport(allocation)}
                            loading={reportMutation.isPending}
                          >
                            Envoyer le rapport
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
