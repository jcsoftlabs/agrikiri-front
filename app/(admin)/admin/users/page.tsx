'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Button from '@/components/ui/Button';
import LevelBadge from '@/components/mlm/LevelBadge';
import {
  createAdminUser,
  deleteAdminUser,
  getDeliveryAgentHistory,
  getUsersList,
  updateAdminUser,
  type AdminUserPayload,
  type CreateAdminUserPayload,
  type UpdateAdminUserPayload,
  type UserListItem,
} from '@/lib/services/admin';

type UserModalState = {
  open: boolean;
  mode: 'create' | 'edit';
  user?: UserListItem;
};

type UserFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: AdminUserPayload['role'];
  isActive: boolean;
};

const EMPTY_USER_FORM: UserFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'CUSTOMER',
  isActive: true,
};

const ROLE_OPTIONS: Array<{ value: AdminUserPayload['role']; label: string }> = [
  { value: 'CUSTOMER', label: 'Client' },
  { value: 'AYIZAN', label: 'AYIZAN' },
  { value: 'BUYER', label: 'Acheteur terrain' },
  { value: 'DELIVERY_AGENT', label: 'Livreur' },
  { value: 'STOCK_MANAGER', label: 'Gestionnaire de stock' },
  { value: 'CASHIER', label: 'Caissier POS' },
  { value: 'ACCOUNTANT', label: 'Comptabilité' },
  { value: 'ADMIN', label: 'Admin' },
];

function RoleBadge({ role }: { role: UserListItem['role'] }) {
  const roleStyles = {
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    AYIZAN: 'bg-agri-green-50 text-agri-green-700 border-agri-green-200',
    BUYER: 'bg-amber-50 text-amber-700 border-amber-200',
    DELIVERY_AGENT: 'bg-blue-50 text-blue-700 border-blue-200',
    STOCK_MANAGER: 'bg-lime-50 text-lime-700 border-lime-200',
    CASHIER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ACCOUNTANT: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    CUSTOMER: 'bg-gray-50 text-gray-600 border-gray-200',
  } as const;

  return (
    <span className={`badge border ${roleStyles[role as keyof typeof roleStyles] ?? roleStyles.CUSTOMER}`}>
      {role}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        isActive
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-red-50 text-red-600 border-red-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`} />
      {isActive ? 'Actif' : 'Inactif'}
    </span>
  );
}

function MlmStatusCell({ role, mlmLevel }: { role: UserListItem['role']; mlmLevel: UserListItem['mlmLevel'] }) {
  if (role !== 'AYIZAN') {
    return <span className="text-xs font-medium text-gray-400">Non applicable</span>;
  }

  return <LevelBadge level={mlmLevel} size="sm" />;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | AdminUserPayload['role']>('');
  const [userModal, setUserModal] = useState<UserModalState>({ open: false, mode: 'create' });
  const [userForm, setUserForm] = useState<UserFormData>(EMPTY_USER_FORM);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: () => getUsersList(page, 20, search, roleFilter || undefined),
  });
  const { data: deliveryHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['delivery-agent-history', historyUserId],
    queryFn: () => getDeliveryAgentHistory(historyUserId!),
    enabled: Boolean(historyUserId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateAdminUserPayload) => createAdminUser(payload),
    onSuccess: () => {
      toast.success('Utilisateur créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserModal({ open: false, mode: 'create' });
      setUserForm(EMPTY_USER_FORM);
      setPage(1);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAdminUserPayload }) =>
      updateAdminUser(id, payload),
    onSuccess: () => {
      toast.success('Utilisateur mis à jour');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserModal({ open: false, mode: 'create' });
      setUserForm(EMPTY_USER_FORM);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      toast.success('Utilisateur désactivé');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la désactivation');
    },
  });

  const users = usersData?.users || [];
  const pagination = usersData?.pagination;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openCreateModal = () => {
    setUserForm(EMPTY_USER_FORM);
    setUserModal({ open: true, mode: 'create' });
  };

  const openEditModal = (user: UserListItem) => {
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      password: '',
      role: user.role as AdminUserPayload['role'],
      isActive: user.isActive,
    });
    setUserModal({ open: true, mode: 'edit', user });
  };

  const closeModal = () => {
    setUserModal({ open: false, mode: 'create' });
    setUserForm(EMPTY_USER_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (userModal.mode === 'create') {
      createMutation.mutate(userForm);
      return;
    }

    if (!userModal.user) return;

    const payload: UpdateAdminUserPayload = {
      firstName: userForm.firstName,
      lastName: userForm.lastName,
      email: userForm.email,
      phone: userForm.phone,
      role: userForm.role,
      isActive: userForm.isActive,
      ...(userForm.password.trim() ? { password: userForm.password } : {}),
    };

    updateMutation.mutate({ id: userModal.user.id, payload });
  };

  const handleDeactivate = (user: UserListItem) => {
    const confirmed = confirm(`Désactiver le compte de ${user.firstName} ${user.lastName} ?`);
    if (!confirmed) return;
    deleteMutation.mutate(user.id);
  };

  const handleReactivate = (user: UserListItem) => {
    updateMutation.mutate({
      id: user.id,
      payload: { isActive: true, role: user.role as AdminUserPayload['role'] },
    });
  };

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />

      <main className="flex-1 lg:ml-64 p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-agri-dark">Gestion des Utilisateurs</h1>
            <p className="text-gray-500 mt-1">Création, mise à jour et suivi des comptes clients, acheteurs terrain, AYIZAN et admins</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-agri-green-600 transition-colors">
                🔍
              </span>
              <input
                type="text"
                placeholder="Rechercher (nom, email, téléphone...)"
                className="pl-11 pr-6 py-2.5 rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm text-sm outline-none focus:ring-2 focus:ring-agri-green-500 shadow-sm transition-all w-full sm:w-[320px]"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="px-4 py-2.5 rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm text-sm outline-none focus:ring-2 focus:ring-agri-green-500 shadow-sm transition-all"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as '' | AdminUserPayload['role']);
                setPage(1);
              }}
            >
              <option value="">Tous les rôles</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <Button variant="primary" onClick={openCreateModal}>
              + Nouvel utilisateur
            </Button>
          </div>
        </div>

        <div className="card shadow-sm border border-gray-100 overflow-hidden">
          <div className="space-y-4 p-4 lg:hidden">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="shimmer h-48 w-full rounded-2xl" />
              ))
            ) : users.length > 0 ? (
              users.map((user) => (
                <div key={user.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-agri-green-50 text-agri-green-700 font-bold flex items-center justify-center text-sm border border-agri-green-100 shrink-0">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-agri-dark">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-400 font-mono break-all">{user.email}</div>
                      <div className="text-xs text-gray-400">{user.phone}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <RoleBadge role={user.role} />
                    <StatusBadge isActive={user.isActive} />
                    <MlmStatusCell role={user.role} mlmLevel={user.mlmLevel} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Volume</div>
                      <div className={`font-bold ${
                        Number(user.personalVolume) >= 546 ? 'text-agri-green-600' : 'text-agri-dark'
                      }`}>
                        {user.personalVolume} PSK
                      </div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Inscription</div>
                      <div className="font-medium text-agri-dark">
                        {new Date(user.createdAt).toLocaleDateString('fr-HT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Code parrainage</div>
                    <div className="font-mono text-sm text-gray-500 break-all">{user.referralCode || '-'}</div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {user.role === 'DELIVERY_AGENT' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="sm:flex-1"
                        onClick={() => setHistoryUserId(user.id)}
                      >
                        Historique
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="sm:flex-1"
                      onClick={() => openEditModal(user)}
                    >
                      Modifier
                    </Button>
                    {user.isActive ? (
                      <Button
                        variant="danger"
                        size="sm"
                        className="sm:flex-1"
                        onClick={() => handleDeactivate(user)}
                        loading={deleteMutation.isPending && deleteMutation.variables === user.id}
                      >
                        Désactiver
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="sm:flex-1"
                        onClick={() => handleReactivate(user)}
                        loading={
                          updateMutation.isPending &&
                          updateMutation.variables?.id === user.id &&
                          updateMutation.variables?.payload.isActive === true
                        }
                      >
                        Réactiver
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-400 italic">
                <div className="text-4xl mb-4">📭</div>
                Aucun utilisateur trouvé
              </div>
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="table-agri">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Niveau MLM</th>
                  <th>Volume (PSK)</th>
                  <th>Code Parrainage</th>
                  <th>Inscrit le</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8}>
                        <div className="shimmer h-12 w-full rounded-xl" />
                      </td>
                    </tr>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-agri-green-50 text-agri-green-700 font-bold flex items-center justify-center text-sm border border-agri-green-100">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-agri-dark">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">{user.email}</div>
                            <div className="text-xs text-gray-400">{user.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={user.role} />
                          {user.role === 'DELIVERY_AGENT' && (
                            <Button variant="ghost" size="sm" onClick={() => setHistoryUserId(user.id)}>
                              Historique
                            </Button>
                          )}
                        </div>
                      </td>
                      <td>
                        <StatusBadge isActive={user.isActive} />
                      </td>
                      <td>
                        <MlmStatusCell role={user.role} mlmLevel={user.mlmLevel} />
                      </td>
                      <td>
                        <span
                          className={`font-bold ${
                            Number(user.personalVolume) >= 546 ? 'text-agri-green-600' : 'text-agri-dark'
                          }`}
                        >
                          {user.personalVolume} PSK
                        </span>
                      </td>
                      <td className="font-mono text-sm text-gray-500">{user.referralCode || '-'}</td>
                      <td className="text-gray-400 text-sm">
                        {new Date(user.createdAt).toLocaleDateString('fr-HT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(user)}
                          >
                            Modifier
                          </Button>
                          {user.isActive ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeactivate(user)}
                              loading={deleteMutation.isPending && deleteMutation.variables === user.id}
                            >
                              Désactiver
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReactivate(user)}
                              loading={
                                updateMutation.isPending &&
                                updateMutation.variables?.id === user.id &&
                                updateMutation.variables?.payload.isActive === true
                              }
                            >
                              Réactiver
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400 italic">
                      <div className="text-4xl mb-4">📭</div>
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <div className="flex items-center px-6 text-sm">
                <span className="font-semibold text-agri-dark">Page {page}</span>
                <span className="text-gray-400 ml-1">sur {pagination.totalPages}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={page === pagination.totalPages}
              >
                Suivant
              </Button>
            </div>
          )}
        </div>

        {userModal.open && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl text-agri-dark">
                    {userModal.mode === 'create' ? 'Créer un utilisateur' : 'Modifier l’utilisateur'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {userModal.mode === 'create'
                      ? 'Ajoutez un nouveau compte à la plateforme'
                      : 'Mettez à jour les informations et permissions du compte'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="user-firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Prénom
                    </label>
                    <input
                      id="user-firstName"
                      className="input"
                      value={userForm.firstName}
                      onChange={(e) => setUserForm((current) => ({ ...current, firstName: e.target.value }))}
                      placeholder="Marie"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="user-lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nom
                    </label>
                    <input
                      id="user-lastName"
                      className="input"
                      value={userForm.lastName}
                      onChange={(e) => setUserForm((current) => ({ ...current, lastName: e.target.value }))}
                      placeholder="Jean"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email
                    </label>
                    <input
                      id="user-email"
                      type="email"
                      className="input"
                      value={userForm.email}
                      onChange={(e) => setUserForm((current) => ({ ...current, email: e.target.value }))}
                      placeholder="marie@agrikiri.ht"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="user-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Téléphone
                    </label>
                    <input
                      id="user-phone"
                      className="input"
                      value={userForm.phone}
                      onChange={(e) => setUserForm((current) => ({ ...current, phone: e.target.value }))}
                      placeholder="36123456"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Rôle
                    </label>
                    <select
                      id="user-role"
                      className="input"
                      value={userForm.role}
                      onChange={(e) =>
                        setUserForm((current) => ({
                          ...current,
                          role: e.target.value as AdminUserPayload['role'],
                        }))
                      }
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                      {userModal.mode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe'}
                    </label>
                    <input
                      id="user-password"
                      type="password"
                      className="input"
                      value={userForm.password}
                      onChange={(e) => setUserForm((current) => ({ ...current, password: e.target.value }))}
                      placeholder={userModal.mode === 'create' ? '8 caractères minimum' : 'Laisser vide pour conserver'}
                      required={userModal.mode === 'create'}
                      minLength={userModal.mode === 'create' || userForm.password ? 8 : undefined}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm((current) => ({ ...current, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-agri-green-600 focus:ring-agri-green-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-agri-dark">Compte actif</div>
                    <div className="text-xs text-gray-500">Décochez pour désactiver le compte lors de la mise à jour</div>
                  </div>
                </label>

                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <Button type="button" variant="ghost" className="flex-1" onClick={closeModal}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1" loading={isSaving}>
                    {userModal.mode === 'create' ? 'Créer le compte' : 'Enregistrer les modifications'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {historyUserId && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl text-agri-dark">Historique du livreur</h2>
                  {deliveryHistory && (
                    <p className="text-sm text-gray-500 mt-1">
                      {deliveryHistory.deliveryAgent.firstName} {deliveryHistory.deliveryAgent.lastName}
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
                        { label: 'Total', value: deliveryHistory.stats.total },
                        { label: 'Livrées', value: deliveryHistory.stats.delivered },
                        { label: 'Échecs', value: deliveryHistory.stats.failed },
                        { label: 'En route', value: deliveryHistory.stats.onRoad },
                        { label: 'À récupérer', value: deliveryHistory.stats.pendingPickup },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-gray-100 bg-agri-cream/60 p-4">
                          <div className="text-xs uppercase tracking-wide text-gray-400">{item.label}</div>
                          <div className="mt-2 text-2xl font-bold text-agri-dark">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-3xl border border-gray-100 overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70">
                        <h3 className="font-semibold text-agri-dark">Dernières livraisons assignées</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {deliveryHistory.orders.length > 0 ? (
                          deliveryHistory.orders.map((order) => (
                            <div key={order.id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                              <div>
                                <div className="font-semibold text-agri-dark">{order.orderNumber}</div>
                                <div className="text-sm text-gray-500">
                                  {order.customer.firstName} {order.customer.lastName}
                                  {order.deliveryZone ? ` · ${order.deliveryZone}` : ''}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="font-semibold text-agri-green-700">{order.totalAmount.toLocaleString()} HTG</span>
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{order.status}</span>
                                <span className="text-gray-400">
                                  {new Date(order.createdAt).toLocaleDateString('fr-HT')}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-5 py-10 text-center text-gray-400 italic">
                            Aucune livraison assignée pour ce livreur pour le moment.
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
      </main>
    </div>
  );
}
