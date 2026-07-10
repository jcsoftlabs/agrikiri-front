'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Button from '@/components/ui/Button';
import { downloadPosDocument, listPosSales, PosDocumentType, PosSale } from '@/lib/services/pos';
import toast from 'react-hot-toast';

function formatCurrency(amount: number | string | null | undefined) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} HTG`;
}

export default function PosHistoryPage() {
  const { data: recentSales = [], isLoading } = useQuery({
    queryKey: ['admin-pos-sales'],
    queryFn: listPosSales,
  });

  const handleDownload = async (saleId: string, type: PosDocumentType) => {
    try {
      const blob = await downloadPosDocument(saleId, type);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type.toLowerCase()}-${saleId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Document téléchargé.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible de télécharger ce document.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ec] flex">
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-6 lg:ml-64 lg:p-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <section className="rounded-[28px] border border-[#e8e1d3] bg-white/95 p-5 shadow-lg md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-agri-green-600">Archive POS</p>
                <h1 className="mt-2 font-display text-3xl text-agri-dark">Historique des ventes POS</h1>
                <p className="mt-2 text-sm text-gray-500">
                  Consultez les ventes POS récentes, téléchargez les documents et suivez les proformas, factures et reçus.
                </p>
              </div>
              <Link
                href="/admin/pos"
                className="inline-flex items-center justify-center rounded-2xl border border-[#eadad1] bg-white px-4 py-3 text-sm font-semibold text-agri-dark transition-colors hover:bg-[#fff8f4]"
              >
                Retour au Mini POS
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-[#f7f4ec] px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-[#9b8d80]">Total</div>
                <div className="mt-1 text-2xl font-bold text-agri-dark">{recentSales.length}</div>
              </div>
              <div className="rounded-2xl bg-[#eef8ec] px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-agri-green-700/70">Reçus</div>
                <div className="mt-1 text-2xl font-bold text-agri-dark">
                  {recentSales.filter((sale) => sale.documentType === 'RECEIPT').length}
                </div>
              </div>
              <div className="rounded-2xl bg-[#fff4ef] px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-[#db7a69]">Factures</div>
                <div className="mt-1 text-2xl font-bold text-agri-dark">
                  {recentSales.filter((sale) => sale.documentType === 'INVOICE').length}
                </div>
              </div>
              <div className="rounded-2xl bg-[#f4f1ff] px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7a6ab8]">Proformas</div>
                <div className="mt-1 text-2xl font-bold text-agri-dark">
                  {recentSales.filter((sale) => sale.documentType === 'PROFORMA').length}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#e8e1d3] bg-white/95 p-5 shadow-lg md:p-6">
            <div className="space-y-3 lg:hidden">
              {isLoading ? (
                [...Array(4)].map((_, index) => (
                  <div key={index} className="h-28 rounded-[20px] bg-[#f4f1e8] animate-pulse" />
                ))
              ) : recentSales.length ? (
                recentSales.map((sale: PosSale) => (
                  <div key={sale.id} className="rounded-[22px] border border-[#ebe2d4] bg-[#fcfbf8] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-agri-green-700/70">
                          {sale.documentType === 'RECEIPT' ? 'Reçu' : sale.documentType === 'INVOICE' ? 'Facture' : 'Proforma'}
                        </div>
                        <div className="mt-1 font-bold text-agri-dark">{sale.saleNumber}</div>
                        <div className="mt-1 text-sm text-gray-600">{sale.customerName}</div>
                        <div className="text-xs text-gray-400">{new Date(sale.createdAt).toLocaleString('fr-FR')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Total</div>
                        <div className="font-bold text-agri-green-700">{formatCurrency(sale.totalAmount)}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(['RECEIPT', 'INVOICE', 'PROFORMA'] as PosDocumentType[]).map((type) => (
                        <Button
                          key={type}
                          variant={type === sale.documentType ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleDownload(sale.id, type)}
                        >
                          {type === 'RECEIPT' ? 'Reçu' : type === 'INVOICE' ? 'Facture' : 'Proforma'}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#d8cfbf] bg-[#fcfbf8] p-8 text-center text-gray-500">
                  Aucune vente POS affichée pour le moment.
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full overflow-hidden rounded-[22px] border border-[#ebe2d4]">
                <thead className="bg-[#faf7f2]">
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-[#9b8d80]">
                    <th className="px-4 py-3">N° vente</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Paiement</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebe2d4] bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Chargement des ventes POS...
                      </td>
                    </tr>
                  ) : recentSales.length ? (
                    recentSales.map((sale: PosSale) => (
                      <tr key={sale.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="font-bold text-agri-dark">{sale.saleNumber}</div>
                          <div className="text-xs text-gray-400">{sale.status}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {sale.documentType === 'RECEIPT' ? 'Reçu' : sale.documentType === 'INVOICE' ? 'Facture' : 'Proforma'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-agri-dark">{sale.customerName}</div>
                          <div className="text-xs text-gray-400">{sale.customerPhone || sale.customerEmail || 'Client comptoir'}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{sale.paymentMethod || 'N/A'}</td>
                        <td className="px-4 py-4 font-bold text-agri-green-700">{formatCurrency(sale.totalAmount)}</td>
                        <td className="px-4 py-4 text-sm text-gray-500">{new Date(sale.createdAt).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {(['RECEIPT', 'INVOICE', 'PROFORMA'] as PosDocumentType[]).map((type) => (
                              <Button
                                key={type}
                                variant={type === sale.documentType ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => handleDownload(sale.id, type)}
                              >
                                {type === 'RECEIPT' ? 'Reçu' : type === 'INVOICE' ? 'Facture' : 'Proforma'}
                              </Button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Aucune vente POS affichée pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
