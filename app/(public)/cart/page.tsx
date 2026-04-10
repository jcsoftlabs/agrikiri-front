'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AddressForm from '@/components/account/AddressForm';
import Button from '@/components/ui/Button';
import { createEmptyAddressForm, formatPhoneForDisplay } from '@/lib/address-utils';
import { createOrder } from '@/lib/services/orders';
import { clearPendingPaymentSession, savePendingPaymentSession } from '@/lib/payment-session';
import { createAddress, getMyAddresses, type CustomerAddress } from '@/lib/services/addresses';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

type PaymentMethod = 'PLOPPLOP' | 'MONCASH' | 'CASH' | 'NATCASH' | 'KASHPAW';

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  description: string;
  disabled?: boolean;
}[] = [
  { value: 'CASH', label: 'Paiement à la livraison', description: 'Réglement en espèces lors de la réception.' },
  {
    value: 'PLOPPLOP',
    label: 'PLOP PLOP',
    description: 'Choisissez ensuite MonCash, NatCash ou Kashpaw sur la page sécurisée de paiement.',
    disabled: true,
  },
];

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.isLoading);
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState(
    createEmptyAddressForm({
      fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
      phoneNumber: user?.phone?.replace(/^\+509\s?/, '').replace(/^\+1\s?/, '') || '',
      phoneCountryCode: user?.phone?.startsWith('+1') ? '+1' : '+509',
      countryCode: user?.phone?.startsWith('+1') ? 'US' : 'HT',
    })
  );

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: getMyAddresses,
    enabled: isAuthenticated,
  });
  const createAddressMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: (address) => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
      setSelectedAddressId(address.id);
    },
  });

  useEffect(() => {
    if (!user) return;

    setDeliveryAddress((current) => createEmptyAddressForm({
      ...current,
      fullName: current.fullName || `${user.firstName} ${user.lastName}`.trim(),
      phoneNumber: current.phoneNumber || user.phone?.replace(/^\+509\s?/, '').replace(/^\+1\s?/, '') || '',
      phoneCountryCode: user.phone?.startsWith('+1') ? '+1' : current.phoneCountryCode,
      countryCode: user.phone?.startsWith('+1') ? 'US' : current.countryCode,
    }));
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const defaultAddress = savedAddresses.find((address) => address.isDefault);

    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
      return;
    }

    if (savedAddresses.length === 0) {
      setSelectedAddressId('new');
    }
  }, [isAuthenticated, savedAddresses]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalVP = items.reduce((sum, item) => sum + item.vpPoints * item.quantity, 0);
  const totalWeight = items.reduce((sum, item) => sum + item.weightLbs * item.quantity, 0);

  const handleQuantityChange = (key: string, nextQuantity: number) => {
    if (nextQuantity < 1) {
      removeItem(key);
      return;
    }

    updateQuantity(key, nextQuantity);
  };

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (items.length === 0) {
      toast.error('Votre panier est vide.');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Connectez-vous pour finaliser votre commande.');
      router.push('/login?next=%2Fcart');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedSavedAddress = savedAddresses.find((address) => address.id === selectedAddressId) || null;
      const deliverySnapshot = selectedSavedAddress
        ? {
            label: selectedSavedAddress.label,
            countryCode: selectedSavedAddress.countryCode,
            fullName: selectedSavedAddress.fullName,
            phoneCountryCode: selectedSavedAddress.phoneCountryCode,
            phoneNumber: selectedSavedAddress.phoneNumber,
            addressLine1: selectedSavedAddress.addressLine1,
            addressLine2: selectedSavedAddress.addressLine2 || '',
            city: selectedSavedAddress.city,
            stateRegion: selectedSavedAddress.stateRegion,
            postalCode: selectedSavedAddress.postalCode || '',
            deliveryInstructions: selectedSavedAddress.deliveryInstructions || '',
          }
        : {
            label: deliveryAddress.label,
            countryCode: deliveryAddress.countryCode,
            fullName: deliveryAddress.fullName,
            phoneCountryCode: deliveryAddress.phoneCountryCode,
            phoneNumber: deliveryAddress.phoneNumber,
            addressLine1: deliveryAddress.addressLine1,
            addressLine2: deliveryAddress.addressLine2,
            city: deliveryAddress.city,
            stateRegion: deliveryAddress.stateRegion,
            postalCode: deliveryAddress.postalCode,
            deliveryInstructions: deliveryAddress.deliveryInstructions,
          };

      const result = await createOrder({
        items: items.map((item) => ({
          productId: item.productId,
          productVariantId: item.variantId,
          quantity: item.quantity,
        })),
        deliveryAddress: deliverySnapshot,
        paymentMethod,
      });

      if (!selectedSavedAddress && saveNewAddress) {
        await createAddressMutation.mutateAsync({
          ...deliveryAddress,
          isDefault: deliveryAddress.isDefault || savedAddresses.length === 0,
        });
      }

      clearCart();
      if (result.payment.requiresRedirect && result.payment.paymentUrl) {
        const onlinePaymentMethod = paymentMethod === 'CASH' ? 'PLOPPLOP' : paymentMethod;
        savePendingPaymentSession({
          orderId: result.order.id,
          orderNumber: result.order.orderNumber || result.payment.referenceId,
          paymentMethod: onlinePaymentMethod,
          referenceId: result.payment.referenceId,
          createdAt: new Date().toISOString(),
        });
        toast.success('Commande créée. Redirection vers la page de paiement...');
        window.location.href = result.payment.paymentUrl;
        return;
      }

      clearPendingPaymentSession();
      toast.success('Commande créée avec succès.');
      router.push('/orders');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible de créer la commande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-agri-cream flex flex-col">
        <Navbar />
        <div className="container-agri py-32 flex-1 flex items-center justify-center">
          <div className="text-lg text-gray-500">Chargement du panier...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-agri-cream">
      <Navbar />

      <div className="bg-agri-green-700 pt-24 pb-12">
        <div className="container-agri">
          <h1 className="font-display text-4xl md:text-5xl text-white mb-3">Votre panier</h1>
          <p className="text-white/70">
            {totalItems > 0 ? `${totalItems} article(s) prêt(s) pour la commande` : 'Ajoutez des produits pour commencer'}
          </p>
        </div>
      </div>

      <div className="container-agri py-10">
        {items.length === 0 ? (
          <div className="max-w-2xl mx-auto card p-10 text-center">
            <div className="text-6xl mb-5">🛒</div>
            <h2 className="font-display text-3xl text-agri-dark mb-3">Votre panier est vide</h2>
            <p className="text-gray-500 mb-6">
              Parcourez la boutique et ajoutez vos produits locaux préférés.
            </p>
            <Link href="/shop">
              <Button variant="primary" size="lg">Voir la boutique</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-8 items-start">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.key} className="card p-5 border border-gray-100">
                  <div className="flex flex-col md:flex-row gap-5">
                    <Link
                      href={`/shop/${item.productSlug}`}
                      className="w-full md:w-32 h-32 rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.14),_transparent_36%),linear-gradient(135deg,_#f9fbf4_0%,_#eef6e8_100%)] overflow-hidden flex items-center justify-center text-4xl shrink-0"
                    >
                      {item.imageUrl ? (
                        <div className="w-full h-full p-3 flex items-center justify-center">
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        '🌾'
                      )}
                    </Link>

                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <Link href={`/shop/${item.productSlug}`}>
                            <h2 className="font-semibold text-xl text-agri-dark hover:text-agri-green-600 transition-colors">
                              {item.productName}
                            </h2>
                          </Link>
                          {item.variantLabel && (
                            <p className="text-sm text-gray-500 mt-1">Format: {item.variantLabel}</p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                            <span>{item.weightLbs} Lbs</span>
                            <span>{item.vpPoints} PSK / unité</span>
                            <span>Stock max: {item.maxStock}</span>
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-sm text-gray-500">Prix unitaire</p>
                          <p className="text-2xl font-bold text-agri-green-700">
                            {item.unitPrice.toLocaleString()} HTG
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-5">
                        <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden w-fit">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.key, item.quantity - 1)}
                            className="px-4 py-3 text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
                          >
                            −
                          </button>
                          <span className="px-6 py-3 font-bold text-agri-dark min-w-[60px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.key, item.quantity + 1)}
                            disabled={item.quantity >= item.maxStock}
                            className="px-4 py-3 text-gray-600 hover:bg-gray-50 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>

                        <div className="flex items-center gap-4">
                          <p className="text-lg font-bold text-agri-dark">
                            {(item.unitPrice * item.quantity).toLocaleString()} HTG
                          </p>
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/shop" className="sm:flex-1">
                  <Button variant="secondary" size="lg" className="w-full">
                    Continuer mes achats
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="sm:flex-1"
                  onClick={() => {
                    clearCart();
                    toast.success('Panier vidé.');
                  }}
                >
                  Vider le panier
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="card p-6 border border-gray-100">
                <h2 className="font-display text-2xl text-agri-dark mb-5">Résumé</h2>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Articles</span>
                    <strong className="text-agri-dark">{totalItems}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total PSK</span>
                    <strong className="text-agri-dark">{totalVP.toFixed(2)} PSK</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Poids total</span>
                    <strong className="text-agri-dark">{totalWeight.toFixed(2)} Lbs</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Livraison</span>
                    <strong className="text-agri-dark">Calculée manuellement</strong>
                  </div>
                </div>
                <div className="border-t border-gray-100 mt-5 pt-5 flex items-center justify-between">
                  <span className="text-base font-medium text-gray-600">Total commande</span>
                  <span className="text-3xl font-bold text-agri-green-700">
                    {subtotal.toLocaleString()} HTG
                  </span>
                </div>
              </div>

              <form onSubmit={handleCheckout} className="card p-6 border border-gray-100 space-y-5">
                <div>
                  <h2 className="font-display text-2xl text-agri-dark mb-2">Finaliser la commande</h2>
                  {!isAuthenticated && !authLoading && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 space-y-3">
                      <p>
                        Connectez-vous ou créez un compte pour finaliser votre panier sans perdre vos articles.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="sm:flex-1"
                          onClick={() => router.push('/login?next=%2Fcart')}
                        >
                          Se connecter
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="sm:flex-1"
                          onClick={() => router.push('/register?next=%2Fcart')}
                        >
                          Créer un compte
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {isAuthenticated && savedAddresses.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          Adresse de livraison
                        </label>
                        <button
                          type="button"
                          className="text-sm font-medium text-agri-green-600 hover:underline"
                          onClick={() => setSelectedAddressId('new')}
                        >
                          + Nouvelle adresse
                        </button>
                      </div>
                      <div className="space-y-3">
                        {savedAddresses.map((address) => (
                          <label
                            key={address.id}
                            className={`block rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                              selectedAddressId === address.id
                                ? 'border-agri-green-600 bg-agri-green-50'
                                : 'border-gray-200 bg-white hover:border-agri-green-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="selected-address"
                              value={address.id}
                              checked={selectedAddressId === address.id}
                              onChange={() => setSelectedAddressId(address.id)}
                              className="sr-only"
                            />
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-agri-dark flex items-center gap-2">
                                  {address.label}
                                  {address.isDefault && (
                                    <span className="inline-flex rounded-full bg-agri-green-100 px-2 py-0.5 text-[11px] font-bold text-agri-green-700">
                                      Défaut
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 mt-2 leading-relaxed">
                                  <div>{address.fullName}</div>
                                  <div>{formatPhoneForDisplay(address.phoneCountryCode, address.phoneNumber)}</div>
                                  <div>{address.addressLine1}</div>
                                  {address.addressLine2 && <div>{address.addressLine2}</div>}
                                  <div>{address.city}, {address.stateRegion}</div>
                                  {address.postalCode && <div>{address.postalCode}</div>}
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-gray-400">{address.countryCode}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedAddressId === 'new' && (
                    <div className="rounded-3xl border border-gray-100 bg-agri-cream/60 p-5 space-y-4">
                      <AddressForm
                        value={deliveryAddress}
                        onChange={setDeliveryAddress}
                        submitLabel="Continuer avec cette adresse"
                        loading={false}
                        onSubmit={handleCheckout}
                        wrapInForm={false}
                        showActions={false}
                      />
                      {isAuthenticated && (
                        <label className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={saveNewAddress}
                            onChange={(e) => setSaveNewAddress(e.target.checked)}
                          />
                          <span className="text-sm text-gray-700">Enregistrer cette adresse dans mon compte</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Mode de paiement</label>
                  <div className="space-y-3">
                    {PAYMENT_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`block rounded-2xl border-2 p-4 transition-all ${
                          option.disabled
                            ? 'cursor-not-allowed opacity-60 border-gray-200 bg-gray-50'
                            : 'cursor-pointer'
                        } ${
                          paymentMethod === option.value
                            ? 'border-agri-green-600 bg-agri-green-50'
                            : 'border-gray-200 bg-white hover:border-agri-green-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={option.value}
                          checked={paymentMethod === option.value}
                          onChange={() => setPaymentMethod(option.value)}
                          disabled={option.disabled}
                          className="sr-only"
                        />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-agri-dark">{option.label}</p>
                            <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                            {option.disabled && (
                              <p className="text-xs font-semibold text-amber-700 mt-2">
                                Temporairement indisponible
                              </p>
                            )}
                          </div>
                          <span className="text-xl">
                            {option.value === 'CASH'
                              ? '💵'
                              : '🟠'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {isAuthenticated ? (
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={isSubmitting}
                    disabled={authLoading}
                  >
                    Confirmer la commande
                  </Button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      disabled={authLoading}
                      onClick={() => router.push('/login?next=%2Fcart')}
                    >
                      Se connecter
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="w-full"
                      disabled={authLoading}
                      onClick={() => router.push('/register?next=%2Fcart')}
                    >
                      Créer un compte
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
