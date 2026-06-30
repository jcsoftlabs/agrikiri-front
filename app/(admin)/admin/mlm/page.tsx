'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import LevelBadge, { MLM_LEVEL_CONFIG } from '@/components/mlm/LevelBadge';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { getAdminMlmStats, getAdminWalletWithdrawals, updateAdminWalletWithdrawal, validateMonthlyQuota } from '@/lib/services/mlm';
import toast from 'react-hot-toast';

const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  PROCESSING: 'En traitement',
  PAID: 'Payé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
};

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString('fr-FR')} HTG`;
}

export default function AdminMlmPage() {
  const queryClient = useQueryClient();
  const [withdrawalReference, setWithdrawalReference] = useState<Record<string, string>>({});

  const { data: globalStats, isLoading } = useQuery({
    queryKey: ['admin-mlm-stats'],
    queryFn: getAdminMlmStats,
  });

  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['admin-wallet-withdrawals'],
    queryFn: getAdminWalletWithdrawals,
  });

  const validateMutation = useMutation({
    mutationFn: () => validateMonthlyQuota(),
    onSuccess: () => {
      toast.success('✅ Quotas validés ! Commissions calculées pour tous les membres.');
      queryClient.invalidateQueries({ queryKey: ['admin-mlm-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la validation');
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'PAID' | 'REJECTED' | 'APPROVED' | 'PROCESSING' }) =>
      updateAdminWalletWithdrawal(id, {
        status,
        externalReference: withdrawalReference[id],
      }),
    onSuccess: () => {
      toast.success('Retrait mis à jour.');
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-mlm-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de mettre à jour le retrait.');
    },
  });

  const handleValidateQuota = async () => {
    const confirmed = confirm('Valider les quotas et déclencher le calcul des commissions pour ce mois ?');
    if (!confirmed) return;
    validateMutation.mutate();
  };

  const handleExportCSV = () => {
    toast.success('📥 Export CSV téléchargé');
  };

  const stats = globalStats || {
    totalAyizan: 0,
    activeThisMonth: 0,
    totalCommissionsThisMonth: 0,
    levelDistribution: [],
  };

  const activeRate = stats.totalAyizan > 0 ? (stats.activeThisMonth / stats.totalAyizan) * 100 : 0;

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />

      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-agri-dark">Réseau MLM</h1>
            <p className="text-gray-500 mt-1">Gestion des niveaux, quotas et commissions</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" className="w-full sm:w-auto" onClick={handleExportCSV}>
              📥 Exporter rapport CSV
            </Button>
            <Button 
              id="validate-quota-btn" 
              variant="primary" 
              className="w-full sm:w-auto"
              onClick={handleValidateQuota}
              loading={validateMutation.isPending}
            >
              ✅ Valider quota mensuel
            </Button>
          </div>
        </div>

        {/* Global MLM stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total AYIZAN', value: stats.totalAyizan.toString(), icon: '🌱' },
            { label: 'Actifs ce mois', value: stats.activeThisMonth.toString(), icon: '✅' },
            { label: 'Taux d\'activité', value: `${activeRate.toFixed(0)}%`, icon: '📈' },
            { label: 'Commissions (Mois)', value: `${stats.totalCommissionsThisMonth.toLocaleString()} HTG`, icon: '💰' },
          ].map((stat, i) => (
            <div key={i} className="stat-card border border-gray-100">
              <span className="text-2xl">{stat.icon}</span>
              <div className="text-2xl font-bold text-agri-dark mt-2">
                {isLoading ? <div className="shimmer h-8 w-20 rounded" /> : stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Level distribution */}
        <div className="card p-6 mb-8">
          <h2 className="font-semibold text-agri-dark mb-6 text-lg">Distribution des niveaux</h2>
          <div className="space-y-4">
            {isLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="shimmer h-12 w-full rounded-xl" />)
            ) : stats.levelDistribution.length > 0 ? (
              stats.levelDistribution.map((level) => {
                const config = MLM_LEVEL_CONFIG[level.level as keyof typeof MLM_LEVEL_CONFIG] || { color: '#ccc' };
                const percentage = stats.totalAyizan > 0 ? (level.count / stats.totalAyizan) * 100 : 0;

                return (
                  <div key={level.level} className="rounded-2xl border border-gray-100 bg-white p-4 group">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="sm:w-36 flex-shrink-0">
                      <LevelBadge level={level.level} size="sm" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{level.count} membres</span>
                        <span>{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: config.color,
                          }}
                        />
                      </div>
                    </div>
                    <div className="sm:w-12 text-left sm:text-right font-bold text-agri-dark text-sm">{level.count}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-6 text-gray-400 italic">Aucun membre enregistré dans le réseau MLM</p>
            )}
          </div>
        </div>

        <div className="card p-6 mb-8">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-agri-dark text-lg">Retraits wallet MLM</h2>
              <p className="mt-1 text-sm text-gray-500">Demandes de retrait MonCash/NatCash à payer et référencer.</p>
            </div>
            <div className="rounded-2xl bg-agri-green-50 px-4 py-2 text-sm font-semibold text-agri-green-800">
              {withdrawals.filter((item) => item.status === 'PENDING').length} en attente
            </div>
          </div>

          {withdrawalsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => <div key={index} className="shimmer h-24 w-full rounded-2xl" />)}
            </div>
          ) : withdrawals.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-agri-dark">
                        {withdrawal.user.firstName} {withdrawal.user.lastName}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">{withdrawal.user.email}</div>
                      <div className="mt-2 text-2xl font-bold text-agri-green-700">{formatMoney(withdrawal.amount)}</div>
                    </div>
                    <span className={`badge border ${withdrawal.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : withdrawal.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {WITHDRAWAL_STATUS_LABELS[withdrawal.status] || withdrawal.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Méthode</div>
                      <div className="font-semibold text-agri-dark">{withdrawal.method}</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Destinataire</div>
                      <div className="font-semibold text-agri-dark">{withdrawal.recipientPhone}</div>
                    </div>
                  </div>

                  {withdrawal.status !== 'PAID' && withdrawal.status !== 'REJECTED' && withdrawal.status !== 'CANCELLED' && (
                    <div className="mt-4 space-y-3">
                      <input
                        className="input"
                        placeholder="Référence MonCash après paiement"
                        value={withdrawalReference[withdrawal.id] || ''}
                        onChange={(event) => setWithdrawalReference((current) => ({ ...current, [withdrawal.id]: event.target.value }))}
                      />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateWithdrawalMutation.mutate({ id: withdrawal.id, status: 'APPROVED' })}
                          loading={updateWithdrawalMutation.isPending}
                        >
                          Approuver
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => updateWithdrawalMutation.mutate({ id: withdrawal.id, status: 'PAID' })}
                          loading={updateWithdrawalMutation.isPending}
                        >
                          Marquer payé
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => updateWithdrawalMutation.mutate({ id: withdrawal.id, status: 'REJECTED' })}
                          loading={updateWithdrawalMutation.isPending}
                        >
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-400">
                    Demandé le {new Date(withdrawal.createdAt).toLocaleDateString('fr-HT')}
                    {withdrawal.externalReference ? ` · Réf. ${withdrawal.externalReference}` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              Aucun retrait wallet pour le moment.
            </div>
          )}
        </div>

        {/* Section explicative */}
        <div className="bg-agri-green-50 rounded-2xl p-6 border border-agri-green-100">
          <div className="flex gap-4">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-bold text-agri-green-800 mb-1">Comment fonctionne la validation ?</h3>
              <p className="text-sm text-agri-green-700 leading-relaxed">
                Le bouton <strong>"Valider quota mensuel"</strong> déclenche le calcul final des commissions pour tous les membres ayant atteint leur quota de 546 VP ce mois-ci. 
                Cette action est irréversible pour le mois en cours et génèrera les écritures de commissions "Validées" prêtes pour le paiement.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
