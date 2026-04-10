'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LevelBadge, { MLM_LEVEL_CONFIG } from '@/components/mlm/LevelBadge';
import { useQuery } from '@tanstack/react-query';
import { getMyNetworkTree } from '@/lib/services/mlm';
import { useAuthStore } from '@/store/authStore';

const LEVEL_GUIDE = Object.entries(MLM_LEVEL_CONFIG).map(([key, config]) => ({
  key,
  ...config,
}));

interface NetworkNodeProps {
  node: any;
  depth?: number;
}

function NetworkNode({ node, depth = 0 }: NetworkNodeProps) {
  const config = MLM_LEVEL_CONFIG[node.level] || MLM_LEVEL_CONFIG.AYIZAN;

  return (
    <div className={`flex flex-col items-center ${depth > 0 ? 'mt-4' : ''}`}>
      {/* Node card */}
      <div
        className={`relative p-4 rounded-2xl border-2 bg-white shadow-card text-center min-w-[130px] transition-transform hover:-translate-y-1 hover:shadow-card-hover`}
        style={{ borderColor: config.color }}
      >
        <div className="text-2xl mb-1">{config.icon}</div>
        <div className="font-semibold text-agri-dark text-xs leading-tight">{node.name}</div>
        <div className="mt-1">
          <LevelBadge level={node.level} size="sm" showIcon={false} />
        </div>
        <div className={`text-xs mt-1 font-bold ${node.vp >= 546 ? 'text-agri-green-600' : 'text-gray-400'}`}>
          {node.vp} VP {node.vp >= 546 ? '✓' : ''}
        </div>
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="flex gap-4 mt-4 relative">
          {/* Vertical line from parent */}
          <div className="absolute top-0 left-1/2 -translate-x-0.5 w-0.5 h-4 bg-gray-200 -top-4" />
          {/* Horizontal connector */}
          {node.children.length > 1 && (
            <div
              className="absolute top-0 h-0.5 bg-gray-200"
              style={{
                left: '50%',
                right: '50%',
                transform: 'none',
                width: '100%',
              }}
            />
          )}
          {node.children && node.children.map((child: any, i: number) => (
            <NetworkNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NetworkPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const user = useAuthStore((state) => state.user);
  const isAyizan = user?.role === 'AYIZAN';

  useEffect(() => {
    if (user && user.role !== 'AYIZAN') {
      router.replace('/dashboard');
    }
  }, [router, user]);

  const { data: networkData, isLoading } = useQuery({
    queryKey: ['mlm-network-tree'],
    queryFn: getMyNetworkTree,
    enabled: isAyizan,
  });

  const totalMembers = networkData?.attributes?.totalMembers || 0;
  const activeMembers = networkData?.attributes?.activeMembers || 0;

  if (user && user.role !== 'AYIZAN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-agri-cream">
      {/* Header */}
      <div className="bg-agri-green-700 pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Link href="/dashboard" className="text-white/70 hover:text-white text-sm">← Tableau de bord</Link>
            <button onClick={logout} className="text-white/70 hover:text-red-400 text-sm flex items-center gap-2 transition-colors">
              <span>↩</span> Déconnexion
            </button>
          </div>
          <h1 className="font-display text-4xl text-white mb-2">Mon Réseau MLM</h1>
          <p className="text-white/70">Visualisez et gérez votre équipe</p>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {[
              { label: 'Total membres', value: totalMembers },
              { label: 'Actifs ce mois', value: activeMembers },
              { label: 'Niveaux de profondeur', value: 3 },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/70 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-4 pb-12">
        {/* Network Tree */}
        <div className="card p-5 sm:p-8 mb-8 overflow-x-auto min-h-[300px] flex flex-col justify-center">
          <h2 className="font-semibold text-agri-dark mb-3 text-center bg-white">Arbre de votre réseau</h2>
          <p className="text-xs text-gray-400 text-center mb-6 lg:hidden">
            Faites glisser horizontalement pour explorer votre réseau.
          </p>
          <div className="flex justify-center min-w-max">
            {isLoading ? (
              <div className="text-gray-500">Chargement de votre réseau...</div>
            ) : networkData ? (
              <NetworkNode node={networkData} />
            ) : (
              <div className="text-gray-500 text-center">Aucun membre dans votre réseau pour le moment.</div>
            )}
          </div>
        </div>

        {/* Level guide */}
        <div className="card p-6">
          <h2 className="font-semibold text-agri-dark mb-6">Guide des Niveaux AGRIKIRI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {LEVEL_GUIDE.map(({ key, name, icon, color, description, bg, text, border }) => (
              <div
                key={key}
                className={`p-4 rounded-2xl border-2 ${bg} ${border} text-center`}
              >
                <div className="text-3xl mb-2">{icon}</div>
                <div className={`font-bold text-sm ${text}`}>{name}</div>
                <div className="text-xs text-gray-500 mt-1">{description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
