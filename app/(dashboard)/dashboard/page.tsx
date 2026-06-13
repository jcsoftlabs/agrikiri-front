'use client';

import Link from 'next/link';
import { useState } from 'react';
import LevelBadge from '@/components/mlm/LevelBadge';
import QuotaProgress from '@/components/mlm/QuotaProgress';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getMyMLMStats, getMyNetworkList } from '@/lib/services/mlm';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import api from '@/lib/api';

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

  const stats = statsData || { 
    monthlyCommissions: 0, 
    personalVP: 0, 
    networkVP: 0, 
    newRecruits: 0 
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
                { label: 'Commissions ce mois', value: `${Number(stats.monthlyCommissions || 0).toLocaleString()} HTG`, icon: '💰', color: 'text-agri-green-600', change: 'M' },
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
              <div className="lg:col-span-2 card p-6">
                <h2 className="font-semibold text-agri-dark mb-4">Évolution des commissions</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} HTG`, 'Commissions']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontFamily: 'DM Sans' }}
                    />
                    <Line type="monotone" dataKey="commissions" stroke="#2D7A2D" strokeWidth={3} dot={{ fill: '#2D7A2D', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-6 flex flex-col gap-6">
                <div>
                  <h2 className="font-semibold text-agri-dark mb-2">Mon Niveau</h2>
                  <LevelBadge level={displayLevel} size="lg" showDescription />
                </div>
                <div>
                  <h3 className="font-semibold text-agri-dark mb-3">Quota Mensuel</h3>
                  <QuotaProgress currentVP={stats.personalVP || 0} />
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
                    <div className="text-sm text-gray-500 mt-1">Acheter au moins 9,000 HTG de produits payés</div>
                  </div>
                  <div className="rounded-2xl bg-white border border-gray-100 p-4">
                    <div className="text-sm font-semibold text-agri-dark">Étape 2</div>
                    <div className="text-sm text-gray-500 mt-1">Activer votre compte AYIZAN ici</div>
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
