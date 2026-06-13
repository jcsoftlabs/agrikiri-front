'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import AssociateChat from '@/components/associate/AssociateChat';
import BuyerReportsBoard from '@/components/associate/BuyerReportsBoard';
import DeliveryReportsBoard from '@/components/associate/DeliveryReportsBoard';
import StockReportsBoard from '@/components/associate/StockReportsBoard';
import DossierTracker from '@/components/associate/DossierTracker';
import VotingSystem from '@/components/associate/VotingSystem';

export default function BoardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dossiers' | 'buyers' | 'delivery' | 'stock' | 'votes' | 'chat'>('dossiers');

  // Sécurité : Seuls les associés peuvent voir cette page
  useEffect(() => {
    if (user && user.role !== 'ASSOCIATE') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const tabs = [
    { id: 'dossiers', label: 'Dossiers & Projets', icon: '📁' },
    { id: 'buyers', label: 'Rapports Acheteurs', icon: '🧾' },
    { id: 'delivery', label: 'Rapports Livreurs', icon: '🚚' },
    { id: 'stock', label: 'Rapports Stock', icon: '🏬' },
    { id: 'votes', label: 'Sessions de Vote', icon: '🗳️' },
    { id: 'chat', label: 'Salon Privé (Mini-Slack)', icon: '💬' },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-5 flex flex-col justify-between gap-3 md:mb-8 md:flex-row md:items-end md:gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agri-green-100 text-agri-green-700 text-xs font-bold mb-2">
            🤝 CONSEIL D'ADMINISTRATION
          </div>
          <h1 className="font-display text-3xl text-agri-dark md:text-4xl">Espace Associés</h1>
          <p className="mt-1 text-sm text-gray-500 md:text-base">
            Bienvenue, {user?.firstName}. Vous êtes connecté en tant que <span className="font-semibold text-agri-green-700">{user?.associateType}</span>.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1 md:mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all md:px-6 ${
              activeTab === tab.id
                ? 'bg-agri-green-600 text-white shadow-lg shadow-agri-green-200'
                : 'text-gray-500 hover:bg-agri-green-50 hover:text-agri-green-700'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`transition-all duration-300 ${activeTab === 'chat' ? 'pb-2' : ''}`}>
        {activeTab === 'dossiers' && <DossierTracker />}
        {activeTab === 'buyers' && <BuyerReportsBoard />}
        {activeTab === 'delivery' && <DeliveryReportsBoard />}
        {activeTab === 'stock' && <StockReportsBoard />}
        {activeTab === 'votes' && <VotingSystem />}
        {activeTab === 'chat' && <AssociateChat />}
      </div>
    </div>
  );
}
