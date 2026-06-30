'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LevelBadge from '@/components/mlm/LevelBadge';
import QuotaProgress from '@/components/mlm/QuotaProgress';
import DashboardShell from '@/components/dashboard/DashboardShell';
import Button from '@/components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { downloadMyCommissionsCsv, getMyCommissionHistory, getMyCommissions, getMyMLMStats, getMyMlmActivity, getMyWallet, requestWalletWithdrawal } from '@/lib/services/mlm';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';



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

const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  PROCESSING: 'En traitement',
  PAID: 'Payé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
};

const TRANSACTION_LABELS: Record<string, string> = {
  COMMISSION_CREDIT: 'Commission créditée',
  WITHDRAWAL_HOLD: 'Retrait demandé',
  WITHDRAWAL_RELEASE: 'Retrait libéré',
  WITHDRAWAL_PAYOUT: 'Retrait payé',
  ADMIN_ADJUSTMENT: 'Ajustement admin',
};

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString('fr-FR')} HTG`;
}

function extractMonCashLocalNumber(value?: string | null) {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('509')) {
    return digits.slice(3);
  }

  if (digits.length === 8) {
    return digits;
  }

  return '';
}

export default function EarningsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAyizan = user?.role === 'AYIZAN';
  const queryClient = useQueryClient();
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    recipientPhone: extractMonCashLocalNumber(user?.phone),
    recipientName: user ? `${user.firstName} ${user.lastName}` : '',
    userNote: '',
  });

  useEffect(() => {
    if (user && user.role !== 'AYIZAN') {
      router.replace('/dashboard');
    }
  }, [router, user]);

  useEffect(() => {
    if (!user) return;

    setWithdrawalForm((current) => ({
      ...current,
      recipientPhone: current.recipientPhone || extractMonCashLocalNumber(user.phone),
      recipientName: current.recipientName || `${user.firstName} ${user.lastName}`,
    }));
  }, [user]);

  const { data: statsData } = useQuery({ queryKey: ['mlm-stats'], queryFn: getMyMLMStats, enabled: isAyizan });
  const { data: commissionsData, isLoading } = useQuery({ queryKey: ['mlm-commissions'], queryFn: getMyCommissions, enabled: isAyizan });
  const { data: historyData = [] } = useQuery({ queryKey: ['mlm-commission-history'], queryFn: getMyCommissionHistory, enabled: isAyizan });
  const { data: activityData } = useQuery({ queryKey: ['mlm-activity'], queryFn: getMyMlmActivity, enabled: isAyizan });
  const { data: walletData } = useQuery({ queryKey: ['mlm-wallet'], queryFn: getMyWallet, enabled: isAyizan });

  const stats = statsData || {
    monthlyCommissions: 0,
    monthlyDirectCommissions: 0,
    monthlyNetworkCommissions: 0,
    monthlyBonus: 0,
    personalVP: 0,
    quotaVP: 546,
    currentLevel: undefined,
  };
  const commissions = commissionsData || [];

  const totalEarnings = commissions.reduce((sum, c) => sum + (c.status === 'PAID' || c.status === 'VALIDATED' ? Number(c.amount) : 0), 0);
  const pendingEarnings = commissions.reduce((sum, c) => sum + (c.status === 'PENDING' ? Number(c.amount) : 0), 0);
  const validatedEarnings = commissions.reduce((sum, c) => sum + (c.status === 'VALIDATED' ? Number(c.amount) : 0), 0);
  const paidEarnings = commissions.reduce((sum, c) => sum + (c.status === 'PAID' ? Number(c.amount) : 0), 0);
  const thisMonthEarnings = stats.monthlyCommissions || 0;
  const potentialMonthlyCommission = Number(stats.currentLevel?.monthlyCommission || 0);
  const wallet = walletData?.wallet;
  const minimumWithdrawalAmount = walletData?.minimumWithdrawalAmount || 100;
  const requestedAmount = Number(withdrawalForm.amount || 0);
  const hasValidMonCashPhone = withdrawalForm.recipientPhone.length === 8;
  const withdrawals = walletData?.withdrawals || [];
  const paidWithdrawals = withdrawals.filter((withdrawal) => withdrawal.status === 'PAID');
  const activeWithdrawals = withdrawals.filter((withdrawal) =>
    ['PENDING', 'APPROVED', 'PROCESSING'].includes(withdrawal.status)
  );

  const withdrawalMutation = useMutation({
    mutationFn: requestWalletWithdrawal,
    onSuccess: (withdrawal) => {
      if (withdrawal.status === 'PAID') {
        toast.success('Retrait MonCash envoyé avec succès.');
      } else if (withdrawal.status === 'PROCESSING') {
        toast.success('Retrait MonCash en cours de traitement.');
      } else {
        toast.success('Demande de retrait enregistrée.');
      }
      setWithdrawalForm((current) => ({ ...current, amount: '', userNote: '' }));
      queryClient.invalidateQueries({ queryKey: ['mlm-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['mlm-commissions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de demander ce retrait.');
    },
  });

  const handleWithdrawalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    withdrawalMutation.mutate({
      amount: requestedAmount,
      method: 'MONCASH',
      recipientName: withdrawalForm.recipientName,
      recipientPhone: withdrawalForm.recipientPhone,
      userNote: withdrawalForm.userNote,
    });
  };

  const handleExportCsv = async () => {
    try {
      const blob = await downloadMyCommissionsCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mes-commissions-mlm.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Export CSV téléchargé.');
    } catch {
      toast.error('Impossible de télécharger l’export CSV.');
    }
  };

  if (user && user.role !== 'AYIZAN') {
    return null;
  }

  return (
    <DashboardShell
      currentPath="/earnings"
      title="Mes Gains"
      subtitle="Consultez vos commissions, votre quota et l’historique complet de vos revenus MLM."
      headerAction={
        <Link href="/dashboard" className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-agri-green-300 hover:text-agri-green-700">
          ← Tableau de bord
        </Link>
      }
    >
      <div className="mb-8 overflow-hidden rounded-[30px] border border-white/20 bg-gradient-to-br from-agri-green-800 to-agri-green-600 shadow-[0_22px_70px_rgba(24,50,34,0.16)]">
        <div className="p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-white/60">Performance MLM</div>
          <div className="mt-3 text-5xl font-bold text-white font-display md:text-6xl">
            {Number(wallet?.availableBalance || paidEarnings).toLocaleString('fr-FR')}
            <span className="ml-2 text-2xl font-normal text-white/70">HTG</span>
          </div>
          <p className="mt-2 text-white/70">Solde disponible dans votre wallet MLM</p>
        </div>

        <div className="grid gap-px bg-white/10 sm:grid-cols-3">
          {[
            { label: 'Crédité total', value: formatMoney(wallet?.totalEarned || paidEarnings) },
            { label: 'Retraits en cours', value: formatMoney(wallet?.pendingWithdrawalAmount || 0) },
            { label: 'Déjà retiré', value: formatMoney(wallet?.totalWithdrawn || 0) },
          ].map((item) => (
            <div key={item.label} className="bg-white/10 px-5 py-4 backdrop-blur-sm">
              <div className="text-xl font-bold text-white">{item.value}</div>
              <div className="mt-1 text-sm text-white/70">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 card overflow-hidden p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="font-display text-2xl text-agri-dark">Portefeuille commissions</h2>
              <p className="mt-1 text-sm text-gray-500">Wallet MLM réel : commissions créditées, retraits en attente et historique financier.</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
              {[
                { label: 'Disponible', value: wallet?.availableBalance || 0, tone: 'bg-agri-green-50 text-agri-green-800 border-agri-green-100', help: 'Montant que vous pouvez demander en retrait.' },
                { label: 'Retrait en cours', value: wallet?.pendingWithdrawalAmount || 0, tone: 'bg-blue-50 text-blue-700 border-blue-100', help: 'Montant réservé pendant validation/paiement.' },
                { label: 'En attente commission', value: pendingEarnings + validatedEarnings, tone: 'bg-amber-50 text-amber-700 border-amber-100', help: 'Commissions pas encore créditées au wallet.' },
                { label: 'Retiré', value: wallet?.totalWithdrawn || 0, tone: 'bg-gray-50 text-gray-700 border-gray-100', help: 'Montant déjà sorti du wallet.' },
              ].map((item) => (
                <div key={item.label} className={`rounded-[24px] border p-4 ${item.tone}`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{item.label}</div>
                  <div className="mt-3 text-2xl font-bold">{formatMoney(Number(item.value))}</div>
                  <p className="mt-2 text-xs leading-relaxed opacity-75">{item.help}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 p-4 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
                <div className="rounded-[26px] border border-agri-green-100 bg-gradient-to-br from-agri-green-50 to-white p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-agri-green-700">Retrait MonCash</div>
                  <h3 className="mt-2 font-display text-2xl text-agri-dark">Demander un retrait</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Le système tente l’envoi MonCash automatiquement. Si le numéro n’est pas valide ou si MonCash refuse l’opération, le montant revient dans votre wallet.
                  </p>
                  <form onSubmit={handleWithdrawalSubmit} className="mt-5 space-y-3">
                    <input
                      type="number"
                      min={minimumWithdrawalAmount}
                      step="0.01"
                      value={withdrawalForm.amount}
                      onChange={(event) => setWithdrawalForm((current) => ({ ...current, amount: event.target.value }))}
                      className="input"
                      placeholder={`Montant minimum ${minimumWithdrawalAmount} HTG`}
                    />
                    <input
                      type="text"
                      value={withdrawalForm.recipientName}
                      onChange={(event) => setWithdrawalForm((current) => ({ ...current, recipientName: event.target.value }))}
                      className="input"
                      placeholder="Nom destinataire MonCash"
                    />
                    <div>
                      <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:border-agri-green-300">
                        <div className="flex items-center border-r border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-600">
                          +509
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{8}"
                          maxLength={8}
                          value={withdrawalForm.recipientPhone}
                          onChange={(event) =>
                            setWithdrawalForm((current) => ({
                              ...current,
                              recipientPhone: event.target.value.replace(/\D/g, '').slice(0, 8),
                            }))
                          }
                          className="w-full bg-transparent px-4 py-3 text-base text-agri-dark outline-none"
                          placeholder="37007294"
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">Entrez uniquement les 8 chiffres du numéro MonCash.</p>
                    </div>
                    <textarea
                      value={withdrawalForm.userNote}
                      onChange={(event) => setWithdrawalForm((current) => ({ ...current, userNote: event.target.value }))}
                      className="input min-h-[90px] resize-none"
                      placeholder="Note optionnelle"
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      loading={withdrawalMutation.isPending}
                      disabled={!wallet || !hasValidMonCashPhone || requestedAmount < minimumWithdrawalAmount || requestedAmount > Number(wallet.availableBalance || 0)}
                    >
                      Retirer via MonCash
                    </Button>
                  </form>
                </div>

                <div className="rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Historique wallet</div>
                      <h3 className="mt-2 font-display text-2xl text-agri-dark">Mouvements récents</h3>
                    </div>
                    <div className="rounded-2xl bg-agri-green-50 px-3 py-2 text-sm font-bold text-agri-green-800">
                      {formatMoney(wallet?.availableBalance || 0)}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {(walletData?.transactions || []).slice(0, 6).length > 0 ? (
                      walletData!.transactions.slice(0, 6).map((transaction) => (
                        <div key={transaction.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-agri-dark">
                                {TRANSACTION_LABELS[transaction.type] || transaction.type}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">{transaction.description}</div>
                            </div>
                            <div className={transaction.amount >= 0 ? 'font-bold text-agri-green-700' : 'font-bold text-red-600'}>
                              {transaction.amount >= 0 ? '+' : ''}{formatMoney(transaction.amount)}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-400">
                            {new Date(transaction.createdAt).toLocaleDateString('fr-HT')} · Solde {formatMoney(transaction.balanceAfter)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
                        Aucun mouvement wallet pour le moment.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-agri-dark">Historique réel mois par mois</h3>
                  <p className="text-sm text-gray-500">Commissions créées sur les 12 derniers mois.</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1ea" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8a927f' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#8a927f' }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [`${Number(value).toLocaleString('fr-FR')} HTG`, name === 'paid' ? 'Payé' : name === 'validated' ? 'Validé' : name === 'pending' ? 'En attente' : 'Total']}
                      contentStyle={{ borderRadius: '16px', border: '1px solid #eef1ea', boxShadow: '0 18px 50px rgba(24,50,34,0.12)', fontFamily: 'DM Sans' }}
                    />
                    <Bar dataKey="pending" stackId="a" fill="#f0b429" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="validated" stackId="a" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="paid" stackId="a" fill="#2d7a2d" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Direct ce mois', value: stats.monthlyDirectCommissions || 0 },
                  { label: 'Réseau ce mois', value: stats.monthlyNetworkCommissions || 0 },
                  { label: 'Bonus ce mois', value: stats.monthlyBonus || 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="text-sm font-semibold text-agri-dark">{Number(item.value).toLocaleString()} HTG</div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-6">
            <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-agri-dark mb-3">Quota Mensuel</h2>
              <QuotaProgress currentVP={stats.personalVP || 0} targetVP={stats.quotaVP || 546} />
            </div>
            <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-2">Votre niveau actuel</div>
              <LevelBadge level={user?.mlmLevel || 'CUSTOMER'} size="lg" showDescription />
            </div>
            <div className="rounded-[24px] bg-agri-green-50 p-4">
              <div className="text-sm text-agri-green-700 font-medium mb-1">Commission mensuelle potentielle</div>
              <div className="text-2xl font-bold text-agri-green-800">
                {potentialMonthlyCommission > 0 ? `${potentialMonthlyCommission.toLocaleString()} HTG` : 'Selon le grade'}
              </div>
              <div className="text-xs text-agri-green-600 mt-1">Si quota 546 VP atteint</div>
            </div>
          </div>
        </div>

        <div className="card mb-6 p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-display text-2xl text-agri-dark">Historique des retraits</h2>
              <p className="mt-1 text-sm text-gray-500">Suivez chaque retrait MonCash demandé, payé ou retourné dans votre wallet.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-agri-green-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-agri-green-700/70">Total</div>
                <div className="mt-1 text-xl font-bold text-agri-green-800">{withdrawals.length}</div>
              </div>
              <div className="rounded-2xl bg-blue-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700/70">En cours</div>
                <div className="mt-1 text-xl font-bold text-blue-800">{activeWithdrawals.length}</div>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 col-span-2 sm:col-span-1">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Payés</div>
                <div className="mt-1 text-xl font-bold text-agri-dark">{paidWithdrawals.length}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {withdrawals.length > 0 ? (
              withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-agri-dark">{formatMoney(withdrawal.amount)}</div>
                      <div className="mt-1 text-sm text-gray-500">{withdrawal.method} · +{withdrawal.recipientPhone}</div>
                    </div>
                    <span className={`badge border ${withdrawal.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : withdrawal.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {WITHDRAWAL_STATUS_LABELS[withdrawal.status] || withdrawal.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 px-3 py-3">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Destinataire</div>
                      <div className="mt-1 text-sm font-semibold text-agri-dark">{withdrawal.recipientName || 'Titulaire du wallet'}</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-3 py-3">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Demandé le</div>
                      <div className="mt-1 text-sm font-semibold text-agri-dark">{new Date(withdrawal.createdAt).toLocaleDateString('fr-HT')}</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    {withdrawal.paidAt ? (
                      <div>Payé le {new Date(withdrawal.paidAt).toLocaleDateString('fr-HT')}</div>
                    ) : withdrawal.reviewedAt ? (
                      <div>Mis à jour le {new Date(withdrawal.reviewedAt).toLocaleDateString('fr-HT')}</div>
                    ) : null}
                    {withdrawal.externalReference ? <div>Référence MonCash: {withdrawal.externalReference}</div> : null}
                    {withdrawal.adminNote ? <div>Note système: {withdrawal.adminNote}</div> : null}
                    {withdrawal.userNote ? <div>Votre note: {withdrawal.userNote}</div> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 lg:col-span-2">
                Aucun retrait demandé pour le moment.
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-display text-2xl text-agri-dark">Détail des Commissions</h2>
              <p className="mt-1 text-sm text-gray-500">Retrouvez chaque gain, sa provenance et son état de paiement.</p>
            </div>
            <button
              onClick={handleExportCsv}
              className="rounded-xl border border-agri-green-200 bg-white px-4 py-2 text-sm font-medium text-agri-green-700 transition-colors hover:bg-agri-green-50"
            >
              Export CSV
            </button>
          </div>

          <div className="space-y-4 lg:hidden">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="shimmer h-36 w-full rounded-2xl" />
              ))
            ) : commissions.length > 0 ? (
              commissions.map((commission, i) => (
                <div key={i} className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm space-y-3">
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
                    <div className="rounded-2xl bg-gray-50 px-3 py-2 text-sm font-medium text-agri-dark break-all">
                      {commission.sourceUserId || 'Système'}
                    </div>
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
                  {commission.orderNumber && (
                    <div className="rounded-2xl bg-agri-green-50 px-3 py-2 text-xs text-agri-green-800">
                      Commande {commission.orderNumber} · {Number(commission.orderTotal || 0).toLocaleString('fr-FR')} HTG · {Number(commission.orderVP || 0).toLocaleString('fr-FR')} PSK
                    </div>
                  )}
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
                        {commission.orderNumber && (
                          <div className="mt-1 text-xs font-normal text-gray-400">
                            {commission.orderNumber} · {Number(commission.orderTotal || 0).toLocaleString('fr-FR')} HTG
                          </div>
                        )}
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

        <div className="card mt-6 p-6">
          <div className="mb-5">
            <h2 className="font-display text-2xl text-agri-dark">Dernières activités réseau</h2>
            <p className="mt-1 text-sm text-gray-500">Qui a acheté, quelle commande a généré quelle commission.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(activityData?.recentCommissions || []).length > 0 ? (
              activityData!.recentCommissions.slice(0, 8).map((commission) => (
                <div key={commission.id} className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-agri-dark">{commission.sourceUserId}</div>
                      <div className="mt-1 text-xs text-gray-400">
                        {commission.orderNumber ? `Commande ${commission.orderNumber}` : 'Commission système'}
                      </div>
                    </div>
                    <span className={`badge border ${STATUS_STYLES[commission.status] || 'bg-gray-50'}`}>
                      {STATUS_LABELS[commission.status] || commission.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-gray-50 px-3 py-2">
                      <div className="text-xs text-gray-400">Commande</div>
                      <div className="font-semibold text-agri-dark">{Number(commission.orderTotal || 0).toLocaleString('fr-FR')} HTG</div>
                    </div>
                    <div className="rounded-2xl bg-agri-green-50 px-3 py-2">
                      <div className="text-xs text-agri-green-700/70">Commission</div>
                      <div className="font-semibold text-agri-green-800">+{Number(commission.amount).toLocaleString('fr-FR')} HTG</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 lg:col-span-2">
                Aucune activité commission récente.
              </div>
            )}
          </div>
        </div>
    </DashboardShell>
  );
}
