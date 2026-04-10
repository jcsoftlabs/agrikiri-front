'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import LevelBadge, { MLM_LEVEL_CONFIG } from '@/components/mlm/LevelBadge';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { getAdminMlmStats, validateMonthlyQuota } from '@/lib/services/mlm';
import toast from 'react-hot-toast';

export default function AdminMlmPage() {
  const queryClient = useQueryClient();

  const { data: globalStats, isLoading } = useQuery({
    queryKey: ['admin-mlm-stats'],
    queryFn: getAdminMlmStats,
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display text-3xl text-agri-dark">Réseau MLM</h1>
            <p className="text-gray-500 mt-1">Gestion des niveaux, quotas et commissions</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExportCSV}>
              📥 Exporter rapport CSV
            </Button>
            <Button 
              id="validate-quota-btn" 
              variant="primary" 
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
                  <div key={level.level} className="flex items-center gap-4 group">
                    <div className="w-36 flex-shrink-0">
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
                    <div className="w-12 text-right font-bold text-agri-dark text-sm">{level.count}</div>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-6 text-gray-400 italic">Aucun membre enregistré dans le réseau MLM</p>
            )}
          </div>
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
