'use client';

import Link from 'next/link';
import { useState } from 'react';
import LevelBadge from '@/components/mlm/LevelBadge';
import QuotaProgress from '@/components/mlm/QuotaProgress';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { useQuery } from '@tanstack/react-query';
import { getMyMLMStats, getMyNetworkList, getMyMlmActivity } from '@/lib/services/mlm';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const formatMoney = (value: number) => `${Number(value || 0).toLocaleString('fr-FR')} HTG`;

export default function DashboardPage() {
  const { user, checkAuth } = useAuthStore();
  const [isActivatingAyizan, setIsActivatingAyizan] = useState(false);
  const isAyizan = user?.role === 'AYIZAN';
  const displayLevel = isAyizan ? (user?.mlmLevel || 'AYIZAN') : 'CUSTOMER';

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['mlm-stats'],
    queryFn: getMyMLMStats,
    enabled: isAyizan,
  });

  const { data: teamData = [], isLoading: teamLoading } = useQuery({
    queryKey: ['mlm-team'],
    queryFn: getMyNetworkList,
    enabled: isAyizan,
  });

  const { data: activityData } = useQuery({
    queryKey: ['mlm-activity'],
    queryFn: getMyMlmActivity,
    enabled: isAyizan,
  });

  const stats = statsData || { 
    monthlyCommissions: 0, 
    monthlyDirectCommissions: 0,
    monthlyNetworkCommissions: 0,
    monthlyBonus: 0,
    personalVP: 0, 
    networkVP: 0, 
    newRecruits: 0,
    quotaReached: false,
    quotaVP: 546,
    quotaProgress: 0,
    downlineCount: 0,
    currentLevel: undefined,
    nextLevel: null,
  };

  const referralUrl =
    typeof window !== 'undefined' && user?.referralCode
      ? `${window.location.origin}/register?ref=${encodeURIComponent(user.referralCode)}`
      : '';
  const qrCodeUrl = referralUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(referralUrl)}`
    : '';

  const copyReferralCode = async () => {
    if (!user?.referralCode) return;

    try {
      await navigator.clipboard.writeText(user.referralCode);
      toast.success('Code de parrainage copié.');
    } catch {
      toast.error('Impossible de copier le code automatiquement.');
    }
  };

  const shareReferralCode = async () => {
    if (!user?.referralCode) return;

    const shareText = `Rejoins AGRIKIRI avec mon code de référence ${user.referralCode}`;

    if (navigator.share && referralUrl) {
      try {
        await navigator.share({
          title: 'Rejoindre AGRIKIRI',
          text: shareText,
          url: referralUrl,
        });
        return;
      } catch {
        // Fall back to WhatsApp if native sharing is cancelled or unavailable.
      }
    }

    const message = encodeURIComponent(referralUrl ? `${shareText}\n${referralUrl}` : shareText);
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleBecomeAyizan = async () => {
    setIsActivatingAyizan(true);

    try {
      const response = await api.post('/auth/become-ayizan');
      await checkAuth();
      toast.success(response.data?.message || 'Vous êtes maintenant membre AYIZAN.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible d’activer le compte AYIZAN.');
    } finally {
      setIsActivatingAyizan(false);
    }
  };

  return (
    <DashboardShell
      currentPath="/dashboard"
      title={isAyizan ? 'Mon Tableau de Bord' : 'Mon Espace Client'}
      subtitle={isAyizan ? 'Pilotez votre activité réseau, vos volumes et vos commissions.' : 'Retrouvez vos achats, votre profil et votre progression vers AYIZAN.'}
    >
        {isAyizan ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Commissions ce mois', value: formatMoney(stats.monthlyCommissions || 0), icon: '💰', color: 'text-agri-green-600', change: 'M' },
                { label: 'Volume Personnel (VP)', value: Number(stats.personalVP || 0).toString(), icon: '📈', color: 'text-blue-600', change: 'M' },
                { label: 'Volume Réseau (VP)', value: Number(stats.networkVP || 0).toLocaleString(), icon: '🌐', color: 'text-purple-600', change: 'M' },
                { label: 'Nouvelles Recrues', value: Number(stats.newRecruits || 0).toString(), icon: '👥', color: 'text-amber-600', change: 'M' },
              ].map((stat, i) => (
                <div key={i} className="stat-card">
                  <div className="flex justify-between items-start">
                    <span className="text-2xl">{stat.icon}</span>
                    <span className="text-xs font-semibold text-agri-green-600 bg-agri-green-50 px-2 py-0.5 rounded-full">
                      {stat.change}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${stat.color} mt-2`}>{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 card overflow-hidden p-0">
                <div className="bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.18),_transparent_35%),linear-gradient(135deg,_#183222_0%,_#2d6b35_100%)] p-5 text-white sm:p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Centre de parrainage</div>
                  <h2 className="mt-3 font-display text-3xl leading-tight">Partagez votre code, suivez vos gains.</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/72">
                    Un client inscrit avec votre code restera lié à votre réseau et ses achats payés pourront générer vos commissions.
                  </p>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-[1.2fr_0.8fr] sm:p-6">
                  <div className="rounded-[26px] border border-agri-green-100 bg-agri-green-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-agri-green-700/70">Votre code</div>
                    <div className="mt-3 rounded-2xl border border-agri-green-200 bg-white px-4 py-3 font-mono text-2xl font-bold tracking-[0.18em] text-agri-green-800">
                      {user?.referralCode || 'AGK-------'}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={copyReferralCode}
                        className="rounded-2xl border border-agri-green-200 bg-white px-3 py-3 text-sm font-semibold text-agri-green-700 transition-colors hover:bg-agri-green-50"
                      >
                        Copier
                      </button>
                      <button
                        onClick={shareReferralCode}
                        className="rounded-2xl bg-agri-green-700 px-3 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(45,122,45,0.22)] transition-colors hover:bg-agri-green-800"
                      >
                        Partager
                      </button>
                    </div>
                    {referralUrl && (
                      <div className="mt-3 truncate rounded-xl bg-white/70 px-3 py-2 text-xs text-gray-500">
                        {referralUrl}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[26px] border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Prochain grade</div>
                    <div className="mt-3">
                      {stats.nextLevel ? (
                        <>
                          <LevelBadge level={stats.nextLevel.key} size="lg" showDescription />
                          <div className="mt-4 text-sm text-gray-500">
                            Réseau actuel: <strong className="text-agri-dark">{stats.downlineCount}</strong>
                            {typeof stats.nextLevel.requiredDownline === 'number' && (
                              <> / {stats.nextLevel.requiredDownline} membre(s)</>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm font-semibold text-agri-green-700">Vous êtes au niveau le plus élevé disponible.</div>
                      )}
                    </div>
                  </div>
                </div>

                {qrCodeUrl && (
                  <div className="border-t border-gray-100 px-5 py-5 sm:px-6">
                    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                      <div className="mx-auto rounded-[24px] border border-gray-100 bg-white p-3 shadow-sm sm:mx-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCodeUrl} alt="QR code de parrainage" className="h-32 w-32 rounded-2xl" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-agri-dark">QR code de parrainage</div>
                        <p className="mt-1 text-sm leading-relaxed text-gray-500">
                          Un prospect peut scanner ce code pour arriver directement sur l’inscription avec votre référence.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-px bg-gray-100 sm:grid-cols-3">
                  {[
                    { label: 'Direct', value: formatMoney(stats.monthlyDirectCommissions || 0) },
                    { label: 'Réseau', value: formatMoney(stats.monthlyNetworkCommissions || 0) },
                    { label: 'Bonus', value: formatMoney(stats.monthlyBonus || 0) },
                  ].map((item) => (
                    <div key={item.label} className="bg-white px-5 py-4">
                      <div className="text-lg font-bold text-agri-dark">{item.value}</div>
                      <div className="mt-1 text-sm text-gray-500">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6 flex flex-col gap-6">
                <div>
                  <h2 className="font-semibold text-agri-dark mb-2">Mon Niveau</h2>
                  <LevelBadge level={displayLevel} size="lg" showDescription />
                </div>
                <div>
                  <h3 className="font-semibold text-agri-dark mb-3">Quota Mensuel</h3>
                  <QuotaProgress currentVP={stats.personalVP || 0} targetVP={stats.quotaVP || 546} />
                </div>
                {user?.referralCode && (
                  <div className="bg-agri-green-50 rounded-2xl p-4 text-center">
                    <p className="text-sm text-agri-green-700 font-medium">Code de parrainage</p>
                    <div className="font-mono font-bold text-lg text-agri-green-800 mt-1 bg-white rounded-xl px-3 py-2 border border-agri-green-200 tracking-widest">
                      {user.referralCode}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
              <div className="card p-6">
                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-agri-green-700/70">Notifications réseau</div>
                  <h2 className="mt-2 font-display text-2xl text-agri-dark">Filleuls récents</h2>
                </div>
                <div className="space-y-3">
                  {(activityData?.recentRecruits || []).length > 0 ? (
                    activityData!.recentRecruits.slice(0, 5).map((recruit) => (
                      <div key={recruit.id} className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-agri-dark">{recruit.name}</div>
                            <div className="mt-1 text-sm text-gray-500">
                              Inscrit le {new Date(recruit.createdAt).toLocaleDateString('fr-HT')}
                            </div>
                          </div>
                          <LevelBadge level={recruit.mlmLevel} size="sm" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
                      Aucun nouveau filleul pour le moment.
                    </div>
                  )}
                </div>
              </div>

              <div className="card p-6">
                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-agri-green-700/70">Achats attribués</div>
                  <h2 className="mt-2 font-display text-2xl text-agri-dark">Commandes récentes</h2>
                </div>
                <div className="space-y-3">
                  {(activityData?.recentOrders || []).length > 0 ? (
                    activityData!.recentOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-agri-dark">{order.customerName}</div>
                            <div className="mt-1 text-xs text-gray-400">{order.orderNumber}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-agri-green-700">{formatMoney(order.totalAmount)}</div>
                            <div className="mt-1 text-xs text-gray-500">{order.totalVP.toLocaleString()} PSK</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
                      Aucune commande attribuée pour le moment.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-semibold text-agri-dark">Mon Équipe</h2>
                <Link href="/network" className="text-sm text-agri-green-600 font-medium hover:underline">
                  Voir tout le réseau →
                </Link>
              </div>
              <div className="space-y-4 lg:hidden">
                {teamData.length > 0 ? teamData.map((member: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-agri-dark">{member.firstName} {member.lastName}</div>
                        <div className="text-xs text-gray-500 mt-1">{member.lastActive || 'Récent'}</div>
                      </div>
                      <LevelBadge level={member.mlmLevel} size="sm" />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Volume</div>
                        <div className={`font-semibold ${member.personalVolume >= 546 ? 'text-agri-green-600' : 'text-gray-700'}`}>
                          {member.personalVolume} VP {member.personalVolume >= 546 ? '✓' : ''}
                        </div>
                      </div>
                      <span className={`badge ${member.personalVolume >= 100 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'} border`}>
                        {member.personalVolume > 0 ? '● Actif' : '○ Inactif'}
                      </span>
                    </div>

                    <button className="text-sm text-agri-green-600 hover:underline font-medium">
                      Voir
                    </button>
                  </div>
                )) : (
                  <div className="text-center py-4 text-gray-500">Aucun membre dans le réseau</div>
                )}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="table-agri">
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Niveau</th>
                      <th>VP Personnel</th>
                      <th>Dernière activité</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamData.length > 0 ? teamData.map((member: any, i: number) => (
                      <tr key={i}>
                        <td className="font-medium text-agri-dark">{member.firstName} {member.lastName}</td>
                        <td><LevelBadge level={member.mlmLevel} size="sm" /></td>
                        <td>
                          <span className={`font-semibold ${member.personalVolume >= 546 ? 'text-agri-green-600' : 'text-gray-700'}`}>
                            {member.personalVolume} VP {member.personalVolume >= 546 && '✓'}
                          </span>
                        </td>
                        <td className="text-gray-500">{member.lastActive || 'Récent'}</td>
                        <td>
                          <span className={`badge ${member.personalVolume >= 100 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'} border`}>
                            {member.personalVolume > 0 ? '● Actif' : '○ Inactif'}
                          </span>
                        </td>
                        <td>
                          <button className="text-sm text-agri-green-600 hover:underline font-medium">Voir</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-gray-500">Aucun membre dans le réseau</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="text-2xl">🛍️</div>
                <div className="text-2xl font-bold text-agri-green-700">Client</div>
                <div className="text-sm text-gray-500">Compte acheteur actif</div>
              </div>
              <div className="stat-card">
                <div className="text-2xl">📦</div>
                <div className="text-2xl font-bold text-agri-dark">Mes achats</div>
                <div className="text-sm text-gray-500">Suivez vos commandes et livraisons</div>
              </div>
              <div className="stat-card">
                <div className="text-2xl">🌱</div>
                <div className="text-2xl font-bold text-agri-dark">Réseau MLM</div>
                <div className="text-sm text-gray-500">Disponible après activation AYIZAN</div>
              </div>
            </div>

            <div className="card p-8 border border-agri-green-100 bg-gradient-to-br from-white to-agri-green-50">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agri-gold-300/20 border border-agri-gold-300/50 text-agri-gold-700 text-sm font-semibold mb-4">
                  🌱 Devenir AYIZAN
                </div>
                <h2 className="font-display text-3xl text-agri-dark mb-3">Passez du statut client au réseau MLM</h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Votre compte est actuellement un compte acheteur. Pour accéder au réseau, au tableau de bord MLM,
                  aux gains et à votre code de parrainage, vous devez activer le statut AYIZAN.
                </p>
                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                  <div className="rounded-2xl bg-white border border-gray-100 p-4">
                    <div className="text-sm font-semibold text-agri-dark">Étape 1</div>
                    <div className="text-sm text-gray-500 mt-1">Créer et connecter votre compte client</div>
                  </div>
                  <div className="rounded-2xl bg-white border border-gray-100 p-4">
                    <div className="text-sm font-semibold text-agri-dark">Étape 2</div>
                    <div className="text-sm text-gray-500 mt-1">Demander votre activation AYIZAN ici</div>
                  </div>
                  <div className="rounded-2xl bg-white border border-gray-100 p-4">
                    <div className="text-sm font-semibold text-agri-dark">Étape 3</div>
                    <div className="text-sm text-gray-500 mt-1">Accéder à votre réseau et vos commissions</div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/shop">
                    <Button variant="secondary" size="lg">🛒 Aller à la boutique</Button>
                  </Link>
                  <Button
                    variant="primary"
                    size="lg"
                    loading={isActivatingAyizan}
                    onClick={handleBecomeAyizan}
                  >
                    🌱 Activer mon compte AYIZAN
                  </Button>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-agri-dark mb-5">Raccourcis utiles</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Link href="/orders" className="rounded-2xl border border-gray-100 bg-white p-5 hover:border-agri-green-300 hover:shadow-card transition-all">
                  <div className="text-2xl mb-3">📦</div>
                  <div className="font-semibold text-agri-dark">Mes commandes</div>
                  <div className="text-sm text-gray-500 mt-1">Voir vos achats et leur statut</div>
                </Link>
                <Link href="/profile" className="rounded-2xl border border-gray-100 bg-white p-5 hover:border-agri-green-300 hover:shadow-card transition-all">
                  <div className="text-2xl mb-3">👤</div>
                  <div className="font-semibold text-agri-dark">Mon profil</div>
                  <div className="text-sm text-gray-500 mt-1">Consulter vos informations personnelles</div>
                </Link>
              </div>
            </div>
          </div>
        )}
    </DashboardShell>
  );
}
