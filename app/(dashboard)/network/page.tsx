'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LevelBadge, { MLM_LEVEL_CONFIG } from '@/components/mlm/LevelBadge';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { useQuery } from '@tanstack/react-query';
import { getMyNetworkTree } from '@/lib/services/mlm';
import { useAuthStore } from '@/store/authStore';

const MLM_LEVEL_ORDER = [
  'AYIZAN',
  'GUACANAGARIC',
  'MACKANDAL',
  'BOUKMAN',
  'SANITE_BELAIRE',
  'TOUSSAINT_LOUVERTURE',
  'CATHERINE_FLON',
  'JEAN_JACQUES_DESSALINES',
];

const LEVEL_GUIDE = MLM_LEVEL_ORDER.map((key) => ({
  key,
  ...MLM_LEVEL_CONFIG[key],
}));

interface NetworkNodeProps {
  node: any;
  depth?: number;
}

function NetworkNode({ node, depth = 0 }: NetworkNodeProps) {
  const config = MLM_LEVEL_CONFIG[node.level] || MLM_LEVEL_CONFIG.AYIZAN;

  return (
    <div className={`flex flex-col items-center ${depth > 0 ? 'mt-4' : ''}`}>
      <div
        className="relative min-w-[146px] rounded-[24px] border-2 bg-white p-4 text-center shadow-[0_16px_40px_rgba(24,50,34,0.10)] transition-transform hover:-translate-y-1"
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

      {node.children.length > 0 && (
        <div className="flex gap-4 mt-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-0.5 w-0.5 h-4 bg-gray-200 -top-4" />
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

function flattenNetwork(node: any, depth = 0): any[] {
  if (!node) return [];

  return [
    { ...node, depth },
    ...(node.children || []).flatMap((child: any) => flattenNetwork(child, depth + 1)),
  ];
}

export default function NetworkPage() {
  const router = useRouter();
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
  const directMembers = networkData?.attributes?.directMembers || 0;
  const mobileMembers = networkData ? flattenNetwork(networkData).filter((member) => member.depth > 0) : [];

  if (user && user.role !== 'AYIZAN') {
    return null;
  }

  return (
    <DashboardShell
      currentPath="/network"
      title="Mon Réseau MLM"
      subtitle="Visualisez votre équipe, sa profondeur et les niveaux actifs de votre réseau."
      headerAction={
        <Link href="/dashboard" className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-agri-green-300 hover:text-agri-green-700">
          ← Tableau de bord
        </Link>
      }
    >
      <div className="mb-6 overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-[0_22px_70px_rgba(24,50,34,0.08)]">
        <div className="bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.18),_transparent_34%),linear-gradient(135deg,_#f7fbf2_0%,_#edf6e8_100%)] p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-agri-green-700/60">Vue d’ensemble</div>
          <h2 className="mt-2 font-display text-3xl text-agri-dark">La force de votre réseau</h2>
          <p className="mt-2 text-sm text-gray-500">
            Gardez un œil sur votre croissance, les membres actifs et la structure de votre lignée.
          </p>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
          {[
            { label: 'Total membres', value: totalMembers, accent: 'text-agri-dark' },
            { label: 'Directs', value: directMembers, accent: 'text-blue-700' },
            { label: 'Actifs ce mois', value: activeMembers, accent: 'text-agri-green-700' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
              <div className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</div>
              <div className="mt-2 text-sm font-medium text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mb-8 overflow-hidden p-0">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <h2 className="font-display text-2xl text-agri-dark">Arbre de votre réseau</h2>
          <p className="mt-1 text-sm text-gray-500">
            Faites glisser horizontalement sur mobile pour parcourir tous vos niveaux.
          </p>
        </div>

        <div className="border-b border-gray-100 p-4 lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-agri-green-700/70">Vue mobile</div>
              <h3 className="mt-1 font-semibold text-agri-dark">Liste de votre lignée</h3>
            </div>
            <span className="rounded-full bg-agri-green-50 px-3 py-1 text-xs font-semibold text-agri-green-700">
              {mobileMembers.length} membre(s)
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="shimmer h-20 rounded-2xl" />
              ))}
            </div>
          ) : mobileMembers.length > 0 ? (
            <div className="space-y-3">
              {mobileMembers.map((member) => (
                <div key={member.id} className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Niveau {member.depth}
                      </div>
                      <div className="mt-1 truncate font-semibold text-agri-dark">{member.name}</div>
                      <div className="mt-1 text-sm text-gray-500">{Number(member.vp || 0).toLocaleString()} VP personnel</div>
                    </div>
                    <LevelBadge level={member.level} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Aucun membre dans votre réseau pour le moment. Partagez votre code pour commencer.
            </div>
          )}
        </div>

        <div className="min-h-[320px] overflow-x-auto px-5 py-6 sm:px-8">
          <div className="flex justify-center min-w-max">
            {isLoading ? (
              <div className="rounded-[24px] border border-gray-100 bg-white px-6 py-8 text-gray-500 shadow-sm">
                Chargement de votre réseau...
              </div>
            ) : networkData ? (
              <NetworkNode node={networkData} />
            ) : (
              <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-gray-500">
                Aucun membre dans votre réseau pour le moment.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-6">
          <h2 className="font-display text-2xl text-agri-dark">Guide des niveaux AGRIKIRI</h2>
          <p className="mt-1 text-sm text-gray-500">
            Repérez rapidement les rangs, leur identité visuelle et leur rôle dans la progression MLM.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {LEVEL_GUIDE.map(({ key, name, icon, description, bg, text, border }) => (
            <div
              key={key}
              className={`rounded-[24px] border-2 ${bg} ${border} p-5 text-center shadow-sm`}
            >
              <div className="text-3xl mb-2">{icon}</div>
              <div className={`font-bold text-sm ${text}`}>{name}</div>
              <div className="text-xs text-gray-500 mt-2 leading-relaxed">{description}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
