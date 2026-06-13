'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Button from '@/components/ui/Button';
import {
  createAdminUser,
  getDeliveryAgentHistory,
  getUsersList,
  type CreateAdminUserPayload,
  type UserListItem,
} from '@/lib/services/admin';

type DeliveryAgentFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  isActive: boolean;
};

const EMPTY_DELIVERY_AGENT_FORM: DeliveryAgentFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  isActive: true,
};

export default function AdminDeliveryAgentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [agentForm, setAgentForm] = useState<DeliveryAgentFormData>(EMPTY_DELIVERY_AGENT_FORM);

  // Charger uniquement les utilisateurs avec le rôle DELIVERY_AGENT
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-delivery-agents', page, search],
    queryFn: () => getUsersList(page, 20, search, 'DELIVERY_AGENT'),
  });

  const { data: deliveryHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['delivery-agent-history', historyUserId],
    queryFn: () => getDeliveryAgentHistory(historyUserId!),
    enabled: Boolean(historyUserId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateAdminUserPayload) => createAdminUser(payload),
    onSuccess: () => {
      toast.success('Livreur créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-agents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsCreateModalOpen(false);
      setAgentForm(EMPTY_DELIVERY_AGENT_FORM);
      setPage(1);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du livreur');
    },
  });

  const agents = usersData?.users || [];
  const pagination = usersData?.pagination;
  const isCreating = createMutation.isPending;

  const openCreateModal = () => {
    setAgentForm(EMPTY_DELIVERY_AGENT_FORM);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setIsCreateModalOpen(false);
    setAgentForm(EMPTY_DELIVERY_AGENT_FORM);
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate({
      ...agentForm,
      role: 'DELIVERY_AGENT',
    });
  };

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />

      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-agri-dark">Gestion des Livreurs</h1>
            <p className="text-gray-500 mt-1">Suivi des performances et historique des agents de livraison AGRIKIRI</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-agri-green-600 transition-colors">
                🔍
              </span>
              <input
                type="text"
                placeholder="Rechercher un livreur..."
                className="pl-11 pr-6 py-2.5 rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm text-sm outline-none focus:ring-2 focus:ring-agri-green-500 shadow-sm transition-all w-full sm:w-[320px]"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button
              variant="primary"
              className="w-full sm:w-auto shadow-lg shadow-agri-green-100"
              onClick={openCreateModal}
            >
              + Ajouter un livreur
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="shimmer h-64 rounded-3xl" />
            ))
          ) : agents.length > 0 ? (
            agents.map((agent) => (
              <div key={agent.id} className="card p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-agri-green-50 text-agri-green-700 font-display text-xl font-bold flex items-center justify-center border border-agri-green-100 shadow-inner">
                    {agent.firstName[0]}{agent.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg text-agri-dark truncate">
                      {agent.firstName} {agent.lastName}
                    </h3>
                    <div className="text-sm text-gray-400 truncate">{agent.email}</div>
                    <div className="text-sm font-medium text-agri-green-600">{agent.phone}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Inscrit le</div>
                    <div className="text-sm font-semibold text-agri-dark">
                      {new Date(agent.createdAt).toLocaleDateString('fr-HT')}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Statut</div>
                    <div className={`text-sm font-bold ${agent.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      {agent.isActive ? '● Actif' : '○ Inactif'}
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full !rounded-2xl"
                  onClick={() => setHistoryUserId(agent.id)}
                >
                  📊 Voir les performances
                </Button>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="text-5xl mb-4">🚚</div>
              <p className="text-gray-500 italic">Aucun agent de livraison trouvé</p>
            </div>
          )}
        </div>

        {/* Modale d'historique (réutilisation de la logique de users/page.tsx) */}
        {historyUserId && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h2 className="font-display text-2xl text-agri-dark">Performance du Livreur</h2>
                  {deliveryHistory && (
                    <p className="text-sm text-gray-500 mt-1">
                      Agent : <span className="font-semibold text-agri-green-700">{deliveryHistory.deliveryAgent.firstName} {deliveryHistory.deliveryAgent.lastName}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryUserId(null)}
                  className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {isHistoryLoading || !deliveryHistory ? (
                  <div className="space-y-4">
                    <div className="shimmer h-24 w-full rounded-2xl" />
                    <div className="shimmer h-64 w-full rounded-2xl" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                      {[
                        { label: 'Total', value: deliveryHistory.stats.total, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Livrées', value: deliveryHistory.stats.delivered, color: 'bg-green-50 text-green-700' },
                        { label: 'Échecs', value: deliveryHistory.stats.failed, color: 'bg-red-50 text-red-700' },
                        { label: 'En route', value: deliveryHistory.stats.onRoad, color: 'bg-yellow-50 text-yellow-700' },
                        { label: 'Attente', value: deliveryHistory.stats.pendingPickup, color: 'bg-gray-50 text-gray-700' },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-2xl p-4 border border-transparent ${item.color}`}>
                          <div className="text-[10px] uppercase tracking-widest font-black opacity-60">{item.label}</div>
                          <div className="mt-2 text-3xl font-black">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[32px] border border-gray-100 bg-white overflow-hidden shadow-sm">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-display text-lg text-agri-dark">Dernières missions</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {deliveryHistory.orders.length > 0 ? (
                          deliveryHistory.orders.map((order) => (
                            <div key={order.id} className="px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                              <div>
                                <div className="font-bold text-agri-dark">{order.orderNumber}</div>
                                <div className="text-sm text-gray-500">
                                  Destinataire : {order.customer.firstName} {order.customer.lastName}
                                  {order.deliveryZone && <span className="mx-2 text-gray-300">|</span>}
                                  {order.deliveryZone && <span className="text-agri-green-600 font-medium">Zone : {order.deliveryZone}</span>}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="text-right">
                                  <div className="text-sm font-black text-agri-dark">{order.totalAmount.toLocaleString()} HTG</div>
                                  <div className="text-[10px] text-gray-400 uppercase font-bold">{new Date(order.createdAt).toLocaleDateString('fr-HT')}</div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                  order.status === 'DELIVERY_FAILED' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-6 py-12 text-center text-gray-400 italic">
                            Aucune mission assignée pour le moment.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl text-agri-dark">Nouveau livreur</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Créez un compte livreur sans quitter le module de livraison.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
                  aria-label="Fermer la fenêtre"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateAgent} className="p-6 space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Le rôle <span className="font-bold">Livreur</span> sera appliqué automatiquement à ce compte.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Prénom</label>
                    <input
                      type="text"
                      required
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                      value={agentForm.firstName}
                      onChange={(e) => setAgentForm((current) => ({ ...current, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom</label>
                    <input
                      type="text"
                      required
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                      value={agentForm.lastName}
                      onChange={(e) => setAgentForm((current) => ({ ...current, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      required
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                      value={agentForm.email}
                      onChange={(e) => setAgentForm((current) => ({ ...current, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      required
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                      value={agentForm.phone}
                      onChange={(e) => setAgentForm((current) => ({ ...current, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe initial</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                    value={agentForm.password}
                    onChange={(e) => setAgentForm((current) => ({ ...current, password: e.target.value }))}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Le livreur utilisera ces identifiants pour se connecter à son dashboard.
                  </p>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-agri-green-600 focus:ring-agri-green-500"
                    checked={agentForm.isActive}
                    onChange={(e) => setAgentForm((current) => ({ ...current, isActive: e.target.checked }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Activer ce compte dès maintenant</span>
                </label>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={closeCreateModal} className="w-full sm:w-auto">
                    Annuler
                  </Button>
                  <Button type="submit" variant="primary" className="w-full sm:w-auto" loading={isCreating}>
                    Créer le livreur
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
