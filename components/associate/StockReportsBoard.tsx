'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import { downloadStockReportPdf, getBoardStockReports } from '@/lib/services/stock';

function formatWeight(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

async function triggerStockReportDownload(reportId: string, title: string) {
  const blob = await downloadStockReportPdf(reportId);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  link.href = url;
  link.download = `rapport-stock-${safeTitle || reportId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function StockReportsBoard() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['stock-board-reports'],
    queryFn: getBoardStockReports,
  });

  const reports = data?.reports || [];
  const overview = data?.overview;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Rapports', value: overview?.totalReports || 0, icon: '📘' },
          { label: 'Réceptions buyer', value: overview?.totalBuyerReceiptQuantity || 0, icon: '📥' },
          { label: 'Poids reçu', value: `${formatWeight(overview?.totalBuyerReceiptWeightLbs || 0)} Lbs`, icon: '⚖️' },
          { label: 'Sorties stock', value: overview?.totalStockOutputQuantity || 0, icon: '📤' },
          { label: 'Production rentrée', value: overview?.totalProductionInputQuantity || 0, icon: '🏭' },
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
          {[...Array(3)].map((_, index) => <div key={index} className="shimmer h-44 rounded-3xl" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-gray-200 bg-white/85 px-6 py-12 text-center text-gray-500">
          Aucun rapport stock n’a encore été publié.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_18px_60px_rgba(24,50,34,0.08)]">
              <div className="px-5 py-5">
                <button type="button" onClick={() => setExpandedId(expandedId === report.id ? null : report.id)} className="w-full text-left">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      {new Date(report.reportDate).toLocaleDateString('fr-FR')} · {report.stockManager.firstName} {report.stockManager.lastName}
                    </div>
                    <h4 className="mt-3 text-2xl font-semibold text-agri-dark">{report.title}</h4>
                    {report.summary && <p className="mt-2 text-sm text-gray-500">{report.summary}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:w-[420px]">
                    {[
                      { label: 'Réceptions buyer', value: report.buyerReceiptTotalQuantity },
                      { label: 'Poids reçu', value: `${formatWeight(report.buyerReceiptTotalWeightLbs)} Lbs` },
                      { label: 'Sorties stock', value: report.stockOutputTotalQuantity },
                      { label: 'Production entrée', value: report.productionInputTotalQuantity },
                      { label: 'Commande sortie prod.', value: report.productionOrderOutputTotalQuantity },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{metric.label}</div>
                        <div className="mt-2 text-lg font-bold text-agri-dark">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                </button>
                <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        void triggerStockReportDownload(report.id, report.title);
                      }}
                    >
                      Télécharger le PDF
                    </Button>
                  </div>
              </div>

              {expandedId === report.id && (
                <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                  <ReportTable title="Produits reçus" items={report.buyerReceiptItems} showWeight />
                  <ReportTable title="Production / Sortie de stock" items={report.stockOutputItems} showWeight />
                  <ReportTable title="Production / Rentrée de stock" items={report.productionInputItems} />
                  <ReportTable title="Commande / Sortie de stock production" items={report.productionOrderOutputItems} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportTable({ title, items, showWeight = false }: { title: string; items: any[]; showWeight?: boolean }) {
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + Number(item.lineWeightLbs || 0), 0);

  return (
    <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
      <div className="text-sm font-semibold text-agri-dark">{title}</div>
      {items.length === 0 ? (
        <div className="mt-3 text-sm text-gray-500">Aucune ligne sur cette section.</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                <th className="pb-2 pr-4">Description</th>
                <th className="pb-2 pr-4">Quantité</th>
                {showWeight && <th className="pb-2">Poids</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.productId || item.description}-${index}`} className="border-t border-gray-100 text-gray-600">
                  <td className="py-3 pr-4 font-medium text-agri-dark">{item.description}</td>
                  <td className="py-3 pr-4">{item.quantity}</td>
                  {showWeight && <td className="py-3">{formatWeight(Number(item.lineWeightLbs || 0))} Lbs</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 text-agri-dark">
                <td className="pt-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Totals</td>
                <td className="pt-3 pr-4 font-bold">{totalQuantity}</td>
                {showWeight && <td className="pt-3 font-bold">{formatWeight(totalWeight)} Lbs</td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
