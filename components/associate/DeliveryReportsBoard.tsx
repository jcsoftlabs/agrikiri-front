'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBoardDeliveryReports, type DeliveryAgentReport } from '@/lib/services/delivery-reports';
import { getAccountingChannelLabel } from '@/lib/accounting-channels';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatWeightLbs(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function DeliveryReportsBoard() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-reports-board'],
    queryFn: getBoardDeliveryReports,
  });

  const reports = data?.reports || [];
  const overview = data?.overview;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Rapports', value: overview?.totalReports || 0, icon: '📝' },
          { label: 'Courses assignées', value: overview?.totalAssigned || 0, icon: '📦' },
          { label: 'Livrées', value: overview?.totalDelivered || 0, icon: '✅' },
          { label: 'Échecs', value: overview?.totalFailed || 0, icon: '⚠️' },
          { label: 'Cash collecté', value: `${formatMoney(overview?.totalCashCollected || 0)} HTG`, icon: '💵' },
          { label: 'Poids livré', value: `${formatWeightLbs(overview?.totalDeliveredWeightLbs || 0)} Lbs`, icon: '⚖️' },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(24,50,34,0.08)]">
            <div className="text-2xl">{item.icon}</div>
            <div className="mt-3 text-2xl font-bold text-agri-dark">{item.value}</div>
            <div className="mt-1 text-sm text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => <div key={index} className="shimmer h-48 rounded-3xl" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-gray-200 bg-white/85 px-6 py-12 text-center text-gray-500">
          Aucun rapport livreur n’a encore été publié.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <DeliveryReportCard
              key={report.id}
              report={report}
              isExpanded={expandedId === report.id}
              onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryReportCard({
  report,
  isExpanded,
  onToggle,
}: {
  report: DeliveryAgentReport;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
      <button type="button" onClick={onToggle} className="w-full px-5 py-5 text-left">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              {new Date(report.shiftDate).toLocaleDateString('fr-FR')} · {report.deliveryAgent.firstName} {report.deliveryAgent.lastName}
            </div>
            <h4 className="mt-3 text-2xl font-semibold text-agri-dark">{report.title}</h4>
            <p className="mt-2 text-sm text-gray-500">{report.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[420px]">
            {[
              { label: 'Assignées', value: report.totalAssigned },
              { label: 'Livrées', value: report.deliveredCount },
              { label: 'Reste', value: report.remainingAssigned },
              { label: 'Poids', value: `${formatWeightLbs(report.weightUnit === 'KG' ? report.totalDeliveredWeightKg : report.totalDeliveredWeightLbs)} ${report.weightUnit === 'KG' ? 'Kg' : 'Lbs'}` },
              { label: 'Cash', value: `${formatMoney(report.cashCollected)} HTG` },
              { label: 'Frais', value: `${formatMoney(report.fieldExpenses)} HTG` },
              { label: 'Moyen entrée', value: getAccountingChannelLabel(report.cashCollectionMethod) },
              { label: 'Moyen sortie', value: getAccountingChannelLabel(report.fieldExpensesMethod) },
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{metric.label}</div>
                <div className="mt-2 text-lg font-bold text-agri-dark">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Incidents</div>
          <p className="mt-2 text-sm text-gray-600">
            {report.incidents || 'Aucun incident signalé.'}
          </p>
        </div>
            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Prochaines actions</div>
              <p className="mt-2 text-sm text-gray-600">
            {report.nextActions || 'Aucune action complémentaire indiquée.'}
          </p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Bon lié</div>
          <p className="mt-2 text-sm text-gray-600">
            {report.deliveryNote ? `${report.deliveryNote.noteNumber} · ${report.deliveryNote.customerName}` : 'Rapport général sans bon.'}
          </p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Reste après rapport</div>
          <p className="mt-2 text-sm font-semibold text-amber-700">
            {report.remainingAssigned} unité(s) encore à solder
          </p>
        </div>
      </div>

          {report.reportItems.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-3xl border border-gray-100 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-[#faf9f4]">
                  <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Assigné</th>
                    <th className="px-4 py-3">Déjà rapporté</th>
                    <th className="px-4 py-3">Ce rapport</th>
                    <th className="px-4 py-3">Poids</th>
                    <th className="px-4 py-3">Reste</th>
                  </tr>
                </thead>
                <tbody>
                  {report.reportItems.map((item) => (
                    <tr key={item.deliveryNoteItemId} className="border-t border-gray-100 text-gray-600">
                      <td className="px-4 py-3 font-medium text-agri-dark">{item.description}</td>
                      <td className="px-4 py-3">{item.assignedQuantity}</td>
                      <td className="px-4 py-3">{item.alreadyReportedQuantity}</td>
                      <td className="px-4 py-3 font-semibold text-agri-green-700">{item.deliveredThisReport}</td>
                      <td className="px-4 py-3">
                        {formatWeightLbs(report.weightUnit === 'KG' ? item.lineWeightKg : item.lineWeightLbs)} {report.weightUnit === 'KG' ? 'Kg' : 'Lbs'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-700">{item.remainingAfterReport}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
