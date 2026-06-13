'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AddressForm from '@/components/account/AddressForm';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { createEmptyAddressForm, formatPhoneForDisplay } from '@/lib/address-utils';
import api from '@/lib/api';
import {
  createAddress,
  deleteAddress,
  getMyAddresses,
  setDefaultAddress,
  updateAddress,
  type CustomerAddress,
} from '@/lib/services/addresses';
import { useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const displayLevel = user?.role === 'AYIZAN' ? (user?.mlmLevel || 'AYIZAN') : 'CUSTOMER';
  const returnHref =
    user?.role === 'ADMIN'
      ? '/admin'
      : user?.role === 'CASHIER'
        ? '/admin/pos'
        : user?.role === 'ACCOUNTANT'
          ? '/admin/accounting'
          : user?.role === 'STOCK_MANAGER'
            ? '/stock'
            : user?.role === 'BUYER'
              ? '/buyer'
              : user?.role === 'DELIVERY_AGENT'
                ? '/delivery'
                : user?.role === 'ASSOCIATE'
                  ? '/board'
                  : '/dashboard';
  const returnLabel =
    user?.role === 'ADMIN'
      ? 'Retour à l’admin'
      : user?.role === 'CASHIER'
        ? 'Retour au POS'
        : user?.role === 'ACCOUNTANT'
          ? 'Retour à la comptabilité'
          : user?.role === 'STOCK_MANAGER'
            ? 'Retour au stock'
            : user?.role === 'BUYER'
              ? 'Retour aux achats terrain'
              : user?.role === 'DELIVERY_AGENT'
                ? 'Retour aux livraisons'
                : user?.role === 'ASSOCIATE'
                  ? 'Retour à l’espace associés'
                  : 'Retour au tableau de bord';
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone?.replace(/\s+/g, '') || '',
  });
  const [formValue, setFormValue] = useState(
    createEmptyAddressForm({
      fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
      phoneNumber: user?.phone?.replace(/^\+509\s?/, '') || '',
      phoneCountryCode: user?.phone?.startsWith('+1') ? '+1' : '+509',
      countryCode: user?.phone?.startsWith('+1') ? 'US' : 'HT',
    })
  );

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: getMyAddresses,
  });

  useEffect(() => {
    if (!user || showAddressForm || editingAddress) return;

    setFormValue((current) => ({
      ...current,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      phoneNumber: user.phone?.replace(/^\+509\s?/, '').replace(/^\+1\s?/, '') || current.phoneNumber,
      phoneCountryCode: user.phone?.startsWith('+1') ? '+1' : current.phoneCountryCode,
      countryCode: user.phone?.startsWith('+1') ? 'US' : current.countryCode,
    }));
  }, [editingAddress, showAddressForm, user]);

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone?.replace(/\s+/g, '') || '',
    });
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch('/auth/me', profileForm);
      return response.data?.data;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success('Vos informations ont été mises à jour.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de mettre à jour votre profil.');
    },
  });

  const createMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      toast.success('Adresse enregistrée');
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
      setShowAddressForm(false);
      setEditingAddress(null);
      setFormValue(createEmptyAddressForm({
        fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
        phoneNumber: user?.phone?.replace(/^\+509\s?/, '').replace(/^\+1\s?/, '') || '',
      }));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible d’enregistrer cette adresse.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateAddress>[1] }) => updateAddress(id, payload),
    onSuccess: () => {
      toast.success('Adresse mise à jour');
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
      setShowAddressForm(false);
      setEditingAddress(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de mettre à jour cette adresse.');
    },
  });

  const defaultMutation = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: () => {
      toast.success('Adresse par défaut mise à jour');
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
    onError: () => {
      toast.error('Impossible de changer l’adresse par défaut.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      toast.success('Adresse supprimée');
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
    onError: () => {
      toast.error('Impossible de supprimer cette adresse.');
    },
  });

  const startCreate = () => {
    setEditingAddress(null);
    setFormValue(createEmptyAddressForm({
      fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
      phoneNumber: user?.phone?.replace(/^\+509\s?/, '').replace(/^\+1\s?/, '') || '',
      phoneCountryCode: user?.phone?.startsWith('+1') ? '+1' : '+509',
      countryCode: user?.phone?.startsWith('+1') ? 'US' : 'HT',
      isDefault: addresses.length === 0,
    }));
    setShowAddressForm(true);
  };

  const startEdit = (address: CustomerAddress) => {
    setEditingAddress(address);
    setFormValue(createEmptyAddressForm({
      ...address,
      addressLine2: address.addressLine2 || '',
      postalCode: address.postalCode || '',
      deliveryInstructions: address.deliveryInstructions || '',
    }));
    setShowAddressForm(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, payload: formValue });
      return;
    }

    createMutation.mutate(formValue);
  };

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateProfileMutation.mutate();
  };

  return (
    <DashboardShell
      currentPath="/profile"
      title="Mon Profil"
      subtitle="Gérez vos informations, vos adresses de livraison et votre compte client."
      headerAction={
        <Link href={returnHref} className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-agri-green-300 hover:text-agri-green-700">
          ← {returnLabel}
        </Link>
      }
      contentClassName="w-full max-w-6xl mx-auto"
    >
        <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
          <div className="card p-8 bg-white shadow-xl rounded-2xl border border-gray-100">
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
              <div className="w-24 h-24 bg-agri-green-100 rounded-full flex items-center justify-center text-4xl overflow-hidden shadow-inner">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : '👤'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}</h2>
                <p className="text-gray-500 mt-1">{user?.email}</p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-agri-green-50 text-agri-green-700 rounded-full text-sm font-medium">
                  Niveau : {displayLevel === 'CUSTOMER' ? 'Client' : displayLevel}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleProfileSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-agri-cream/40 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg text-agri-dark">Informations personnelles</h3>
                    <p className="text-sm text-gray-500">Mettez à jour votre nom et votre numéro principal.</p>
                  </div>
                  <button
                    type="submit"
                    className="btn-primary !px-4 !py-2"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-gray-600">Prénom</span>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(event) => setProfileForm((current) => ({ ...current, firstName: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-agri-green-400 focus:ring-2 focus:ring-agri-green-100"
                      placeholder="Votre prénom"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-gray-600">Nom</span>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(event) => setProfileForm((current) => ({ ...current, lastName: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-agri-green-400 focus:ring-2 focus:ring-agri-green-100"
                      placeholder="Votre nom"
                    />
                  </label>
                </div>

                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-gray-600">Téléphone principal</span>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-agri-green-400 focus:ring-2 focus:ring-agri-green-100"
                    placeholder="+50936123456"
                  />
                </label>
              </form>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Téléphone principal</div>
                <div className="font-medium">{user?.phone || 'Non renseigné'}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Adresse par défaut</div>
                {addresses.find((address) => address.isDefault) ? (
                  <div className="text-sm text-gray-700 leading-relaxed">
                    <div className="font-medium">{addresses.find((address) => address.isDefault)?.label}</div>
                    <div>{addresses.find((address) => address.isDefault)?.addressLine1}</div>
                    <div>
                      {addresses.find((address) => address.isDefault)?.city}, {addresses.find((address) => address.isDefault)?.stateRegion}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Aucune adresse enregistrée</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-8 bg-white shadow-xl rounded-2xl border border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-display text-3xl text-agri-dark">Mes adresses</h2>
                  <p className="text-gray-500 mt-2">
                    Enregistre plusieurs adresses de livraison et choisis facilement la bonne au checkout.
                  </p>
                </div>
                {!showAddressForm && (
                  <button type="button" className="btn-primary" onClick={startCreate}>
                    + Ajouter une adresse
                  </button>
                )}
              </div>

              {showAddressForm ? (
                <div className="rounded-3xl border border-gray-100 bg-agri-cream/60 p-5">
                  <h3 className="font-display text-2xl text-agri-dark mb-4">
                    {editingAddress ? 'Modifier l’adresse' : 'Nouvelle adresse'}
                  </h3>
                  <AddressForm
                    value={formValue}
                    onChange={setFormValue}
                    submitLabel={editingAddress ? 'Mettre à jour' : 'Enregistrer l’adresse'}
                    loading={createMutation.isPending || updateMutation.isPending}
                    onSubmit={handleSubmit}
                    onCancel={() => {
                      setShowAddressForm(false);
                      setEditingAddress(null);
                    }}
                  />
                </div>
              ) : null}

              <div className="space-y-4 mt-6">
                {isLoading ? (
                  [...Array(2)].map((_, index) => <div key={index} className="shimmer h-40 w-full rounded-2xl" />)
                ) : addresses.length > 0 ? (
                  addresses.map((address) => (
                    <div key={address.id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-lg text-agri-dark">{address.label}</h3>
                            {address.isDefault && (
                              <span className="inline-flex rounded-full bg-agri-green-50 px-3 py-1 text-xs font-semibold text-agri-green-700">
                                Par défaut
                              </span>
                            )}
                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                              {address.countryCode}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 leading-relaxed mt-3">
                            <div className="font-medium text-agri-dark">{address.fullName}</div>
                            <div>{formatPhoneForDisplay(address.phoneCountryCode, address.phoneNumber)}</div>
                            <div className="mt-2">{address.addressLine1}</div>
                            {address.addressLine2 && <div>{address.addressLine2}</div>}
                            <div>{address.city}, {address.stateRegion}</div>
                            {address.postalCode && <div>{address.postalCode}</div>}
                            {address.deliveryInstructions && (
                              <div className="mt-2 text-gray-500">Note: {address.deliveryInstructions}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {!address.isDefault && (
                            <button
                              type="button"
                              className="btn-secondary !px-4 !py-2"
                              onClick={() => defaultMutation.mutate(address.id)}
                            >
                              Définir par défaut
                            </button>
                          )}
                          <button type="button" className="btn-secondary !px-4 !py-2" onClick={() => startEdit(address)}>
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl transition-colors hover:bg-red-100"
                            onClick={() => deleteMutation.mutate(address.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
                    Aucune adresse enregistrée pour le moment.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </DashboardShell>
  );
}
