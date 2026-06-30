'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AddressForm from '@/components/account/AddressForm';
import Button from '@/components/ui/Button';
import { createEmptyAddressForm, formatPhoneForDisplay, getCountryMeta } from '@/lib/address-utils';
import { createOrder } from '@/lib/services/orders';
import { clearPendingPaymentSession, savePendingPaymentSession } from '@/lib/payment-session';
import { createAddress, getMyAddresses, type CustomerAddress } from '@/lib/services/addresses';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

type PaymentMethod = 'PLOPPLOP' | 'MONCASH' | 'CASH' | 'NATCASH' | 'KASHPAW';
type CheckoutStep = 1 | 2 | 3;
type AddressFieldErrors = Partial<Record<'fullName' | 'phoneNumber' | 'addressLine1' | 'city' | 'stateRegion' | 'postalCode', string>>;

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  description: string;
  disabled?: boolean;
}[] = [
  {
    value: 'MONCASH',
    label: 'MonCash',
    description: 'Paiement direct via votre wallet MonCash.',
  },
  { value: 'CASH', label: 'Paiement à la livraison', description: 'Réglement en espèces lors de la réception.' },
  {
    value: 'PLOPPLOP',
    label: 'PLOP PLOP',
    description: 'Choisissez ensuite MonCash, NatCash ou Kashpaw sur la page sécurisée de paiement.',
  },
];

function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
  if (method === 'CASH') {
    return <span className="text-xl">💵</span>;
  }

  if (method === 'MONCASH') {
    return (
      <div className="rounded-2xl border border-agri-green-200 bg-white px-2 py-2 shadow-sm">
        <Image
          src="/MC_button_fr.png"
          alt="Payer avec MonCash"
          width={132}
          height={40}
          className="h-10 w-auto"
        />
      </div>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-agri-green-50 to-agri-gold-300/20 border border-agri-green-200 shadow-sm">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-agri-green-700"
      >
        <rect x="5" y="2.5" width="10" height="19" rx="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 5.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="10" cy="18.2" r="1.1" fill="#B88912" />
        <circle cx="18.2" cy="8.2" r="4.3" fill="#E8F5E9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M18.2 5.9v4.6M16.4 7.4c0-.8.7-1.4 1.8-1.4s1.8.5 1.8 1.2c0 .7-.5 1-1.8 1.3-1.1.2-1.8.6-1.8 1.4 0 .8.8 1.3 1.9 1.3 1 0 1.7-.4 1.9-1.1"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function isAddressComplete(address: {
  countryCode: 'HT' | 'US';
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  city: string;
  stateRegion: string;
  postalCode?: string;
}) {
  const meta = getCountryMeta(address.countryCode);
  if (!address.fullName.trim() || !address.phoneNumber.trim() || !address.addressLine1.trim() || !address.city.trim() || !address.stateRegion.trim()) {
    return false;
  }

  if (address.countryCode === 'HT' && address.phoneNumber.replace(/\D/g, '').length !== 8) {
    return false;
  }

  if (address.countryCode === 'US' && address.phoneNumber.replace(/\D/g, '').length !== 10) {
    return false;
  }

  if (meta.postalCodeRequired && !address.postalCode?.trim()) {
    return false;
  }

  return true;
}

function validateAddressFields(address: {
  countryCode: 'HT' | 'US';
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  city: string;
  stateRegion: string;
  postalCode?: string;
}) {
  const errors: AddressFieldErrors = {};
  const meta = getCountryMeta(address.countryCode);

  if (!address.fullName.trim()) {
    errors.fullName = 'Le nom complet est requis.';
  }

  const phoneDigits = address.phoneNumber.replace(/\D/g, '');
  if (!phoneDigits) {
    errors.phoneNumber = 'Le numéro de téléphone est requis.';
  } else if (address.countryCode === 'HT' && phoneDigits.length !== 8) {
    errors.phoneNumber = 'Le numéro haïtien doit contenir exactement 8 chiffres.';
  } else if (address.countryCode === 'US' && phoneDigits.length !== 10) {
    errors.phoneNumber = 'Le numéro américain doit contenir exactement 10 chiffres.';
  }

  if (!address.addressLine1.trim()) {
    errors.addressLine1 = 'L’adresse principale est requise.';
  } else if (address.addressLine1.trim().length < 5) {
    errors.addressLine1 = 'L’adresse doit être plus précise.';
  }

  if (!address.city.trim()) {
    errors.city = 'La ville est requise.';
  }

  if (!address.stateRegion.trim()) {
    errors.stateRegion = `${meta.stateLabel} est requis.`;
  }

  if (meta.postalCodeRequired && !address.postalCode?.trim()) {
    errors.postalCode = `${meta.postalCodeLabel} est requis.`;
  }

  return errors;
}

function getDeliveryEstimate({
  countryCode,
  totalWeight,
  paymentMethod,
  subtotal,
}: {
  countryCode: 'HT' | 'US';
  totalWeight: number;
  paymentMethod: PaymentMethod;
  subtotal: number;
}) {
  const oneTonLbs = 2202;
  const fiveTonsLbs = oneTonLbs * 5;

  if (countryCode === 'US') {
    const cost = 1850 + Math.max(0, Math.ceil(totalWeight - 2)) * 180;
    return {
      cost,
      label: `${cost.toLocaleString()} HTG`,
      eta: '5 à 10 jours ouvrés',
      service: 'Expédition internationale',
      note: paymentMethod !== 'CASH' ? 'Paiement sécurisé avant expédition.' : 'Les commandes sont confirmées avant expédition.',
    };
  }

  const cost =
    totalWeight > fiveTonsLbs
      ? 0
      : totalWeight >= oneTonLbs
        ? Number((subtotal * 0.05).toFixed(2))
        : Number((subtotal * 0.1).toFixed(2));
  const isFreeDelivery = totalWeight > fiveTonsLbs;
  const isMidTier = totalWeight >= oneTonLbs && totalWeight <= fiveTonsLbs;

  return {
    cost,
    label: `${cost.toLocaleString()} HTG`,
    eta: isFreeDelivery ? '24 à 48 heures' : '48 à 72 heures',
    service: 'Livraison AGRIKIRI',
    note: isFreeDelivery
      ? 'Livraison gratuite pour les commandes de plus de 5 tonnes.'
      : isMidTier
        ? 'Entre 1 et 5 tonnes, le transport est calculé à 5% du montant de la commande.'
        : 'En dessous de 1 tonne, le transport est calculé à 10% du montant de la commande.',
  };
}

function getCartTierLabel(item: {
  quantity: number;
  baseUnitPrice?: number;
  unitPrice: number;
  pricingTiers?: { minQuantity: number; maxQuantity?: number | null; price: number | string }[];
}) {
  const matchedTier = (item.pricingTiers || [])
    .slice()
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .find((tier) => item.quantity >= tier.minQuantity && (tier.maxQuantity == null || item.quantity <= tier.maxQuantity));

  const baseUnitPrice = item.baseUnitPrice ?? item.unitPrice;

  if (!matchedTier || item.unitPrice >= baseUnitPrice) {
    return null;
  }

  return matchedTier.maxQuantity == null
    ? `Palier ${matchedTier.minQuantity}+ appliqué`
    : `Palier ${matchedTier.minQuantity} à ${matchedTier.maxQuantity} appliqué`;
}

function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MONCASH');
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [addressErrors, setAddressErrors] = useState<AddressFieldErrors>({});
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

  useEffect(() => {
    if (searchParams.get('checkout') !== '1') return;
    setCurrentStep(isAuthenticated ? 2 : 1);
  }, [isAuthenticated, searchParams]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalVP = items.reduce((sum, item) => sum + item.vpPoints * item.quantity, 0);
  const totalWeight = items.reduce((sum, item) => sum + item.weightLbs * item.quantity, 0);
  const selectedSavedAddress = savedAddresses.find((address) => address.id === selectedAddressId) || null;
  const activeAddress = selectedSavedAddress
    ? {
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
        label: selectedSavedAddress.label,
      }
    : deliveryAddress;

  const deliveryEstimate = useMemo(
    () =>
      getDeliveryEstimate({
        countryCode: activeAddress.countryCode,
        totalWeight,
        paymentMethod,
        subtotal,
      }),
    [activeAddress.city, activeAddress.countryCode, activeAddress.stateRegion, paymentMethod, subtotal, totalWeight]
  );
  const estimatedGrandTotal = subtotal + deliveryEstimate.cost;
  const canContinueToPayment = isAuthenticated && isAddressComplete(activeAddress);

  const setDeliveryAddressWithValidation = (nextAddress: typeof deliveryAddress) => {
    setDeliveryAddress(nextAddress);
    setAddressErrors(validateAddressFields(nextAddress));
  };

  const handleQuantityChange = (key: string, nextQuantity: number) => {
    if (nextQuantity < 1) {
      removeItem(key);
      return;
    }

    updateQuantity(key, nextQuantity);
  };

  const handleQuantityInputChange = (key: string, value: string, maxStock: number) => {
    if (!value.trim()) {
      updateQuantity(key, 1);
      return;
    }

    const parsedValue = Number.parseInt(value, 10);
    if (Number.isNaN(parsedValue)) {
      return;
    }

    updateQuantity(key, Math.min(maxStock, Math.max(1, parsedValue)));
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Votre panier est vide.');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Connectez-vous pour finaliser votre commande.');
      router.push('/login?next=%2Fcart');
      return;
    }

    if (!isAddressComplete(activeAddress)) {
      if (!selectedSavedAddress) {
        setAddressErrors(validateAddressFields(deliveryAddress));
      }
      toast.error('Complétez correctement votre adresse de livraison avant de continuer.');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
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
        const redirectPaymentMethod = paymentMethod as Exclude<PaymentMethod, 'CASH'>;
        savePendingPaymentSession({
          orderId: result.order.id,
          orderNumber: result.order.orderNumber || result.payment.referenceId,
          paymentMethod: redirectPaymentMethod,
          referenceId: result.payment.referenceId,
          paymentUrl: result.payment.paymentUrl,
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
              <div className="card p-5 border border-gray-100">
                <div className="flex flex-wrap items-center gap-3 md:gap-5">
                  {[
                    { id: 1, label: 'Panier', helper: `${totalItems} article(s)` },
                    { id: 2, label: 'Livraison', helper: 'Adresse et zone' },
                    { id: 3, label: 'Paiement', helper: 'Confirmation' },
                  ].map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        if (step.id === 1 || (step.id === 2 && items.length > 0) || (step.id === 3 && canContinueToPayment)) {
                          setCurrentStep(step.id as CheckoutStep);
                        }
                      }}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                        currentStep === step.id
                          ? 'bg-agri-green-50 border border-agri-green-200'
                          : 'bg-white border border-gray-100'
                      }`}
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        currentStep >= step.id ? 'bg-agri-green-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {step.id}
                      </span>
                      <span>
                        <span className="block font-semibold text-agri-dark">{step.label}</span>
                        <span className="block text-xs text-gray-400">{step.helper}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {currentStep === 1 && (
                <>
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
                              {getCartTierLabel(item) ? (
                                <p className="mt-2 text-sm font-medium text-agri-green-700">{getCartTierLabel(item)}</p>
                              ) : null}
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-sm text-gray-500">Prix unitaire</p>
                              <p className="text-2xl font-bold text-agri-green-700">
                                {item.unitPrice.toLocaleString()} HTG
                              </p>
                              {item.baseUnitPrice != null && item.unitPrice < item.baseUnitPrice ? (
                                <p className="text-xs text-gray-400 line-through">
                                  {item.baseUnitPrice.toLocaleString()} HTG
                                </p>
                              ) : null}
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
                              <input
                                type="number"
                                min="1"
                                max={item.maxStock}
                                inputMode="numeric"
                                value={item.quantity}
                                onChange={(e) => handleQuantityInputChange(item.key, e.target.value, item.maxStock)}
                                className="w-16 bg-transparent px-2 py-3 font-bold text-agri-dark text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                aria-label={`Quantité pour ${item.productName}`}
                              />
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
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="sm:flex-1"
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast('Connectez-vous et nous vous ramènerons ici pour continuer.');
                          router.push('/login?next=%2Fcart%3Fcheckout%3D1');
                          return;
                        }
                        setCurrentStep(2);
                      }}
                    >
                      Passer à la livraison
                    </Button>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <div className="card p-6 border border-gray-100 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl text-agri-dark mb-2">Livraison</h2>
                      <p className="text-sm text-gray-500">
                        Choisissez une adresse claire pour accélérer la préparation et la livraison.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-medium text-agri-green-600 hover:underline"
                      onClick={() => setCurrentStep(1)}
                    >
                      ← Retour au panier
                    </button>
                  </div>

                  {!isAuthenticated && !authLoading && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 space-y-3">
                      <p>
                        Vous êtes presque au checkout. Connectez-vous ou créez un compte, puis nous vous ramenons ici.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="sm:flex-1"
                          onClick={() => router.push('/login?next=%2Fcart%3Fcheckout%3D1')}
                        >
                          Se connecter
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="sm:flex-1"
                          onClick={() => router.push('/register?next=%2Fcart%3Fcheckout%3D1')}
                        >
                          Créer un compte
                        </Button>
                      </div>
                    </div>
                  )}

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
                        onChange={setDeliveryAddressWithValidation}
                        submitLabel="Continuer avec cette adresse"
                        loading={false}
                        onSubmit={(event) => event.preventDefault()}
                        wrapInForm={false}
                        showActions={false}
                        errors={addressErrors}
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

                  <div className="rounded-2xl border border-agri-gold-200 bg-agri-gold-50/60 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="font-semibold text-agri-dark">{deliveryEstimate.service}</p>
                        <p className="text-sm text-gray-600">
                          Estimation {deliveryEstimate.eta} • {deliveryEstimate.label}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-agri-gold-700">{deliveryEstimate.note}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="sm:flex-1"
                      onClick={() => setCurrentStep(1)}
                    >
                      Retour au panier
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="sm:flex-1"
                      onClick={() => {
                        if (!isAuthenticated) {
                          router.push('/login?next=%2Fcart%3Fcheckout%3D1');
                          return;
                        }
                        if (!canContinueToPayment) {
                          if (!selectedSavedAddress) {
                            setAddressErrors(validateAddressFields(deliveryAddress));
                          }
                          toast.error('Complétez correctement votre adresse de livraison.');
                          return;
                        }
                        setCurrentStep(3);
                      }}
                    >
                      Continuer vers le paiement
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="card p-6 border border-gray-100 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl text-agri-dark mb-2">Paiement et confirmation</h2>
                      <p className="text-sm text-gray-500">
                        Vérifiez votre mode de paiement puis confirmez votre commande.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-medium text-agri-green-600 hover:underline"
                      onClick={() => setCurrentStep(2)}
                    >
                      ← Modifier la livraison
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Mode de paiement</label>
                    <div className="space-y-3">
                      {PAYMENT_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`block rounded-2xl border-2 p-4 transition-all cursor-pointer ${
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
                            className="sr-only"
                          />
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-agri-dark">{option.label}</p>
                              <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                            </div>
                            <PaymentMethodIcon method={option.value} />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-agri-cream/70 p-4 text-sm text-gray-600 space-y-2">
                    <p className="font-semibold text-agri-dark">Avant de confirmer</p>
                    <p>Adresse: {activeAddress.fullName}, {activeAddress.city}, {activeAddress.stateRegion}</p>
                    <p>Livraison estimée: {deliveryEstimate.eta}</p>
                    <p>Total estimatif: <strong className="text-agri-dark">{estimatedGrandTotal.toLocaleString()} HTG</strong></p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="sm:flex-1"
                      onClick={() => setCurrentStep(2)}
                    >
                      Retour livraison
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="sm:flex-1"
                      loading={isSubmitting}
                      disabled={authLoading}
                      onClick={() => void handleCheckout()}
                    >
                      Confirmer la commande
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="card p-6 border border-gray-100 xl:sticky xl:top-28">
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
                    <span>Livraison estimée</span>
                    <strong className="text-agri-dark">{deliveryEstimate.label}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Délai estimé</span>
                    <strong className="text-agri-dark">{deliveryEstimate.eta}</strong>
                  </div>
                </div>
                <div className="border-t border-gray-100 mt-5 pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-600">Sous-total</span>
                    <span className="text-xl font-bold text-agri-dark">
                      {subtotal.toLocaleString()} HTG
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-600">Total estimatif</span>
                    <span className="text-3xl font-bold text-agri-green-700">
                      {estimatedGrandTotal.toLocaleString()} HTG
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-600 space-y-2">
                  <p className="font-semibold text-agri-dark">Progression</p>
                  <p>
                    {currentStep === 1 && 'Vérifiez votre panier avant de passer à la livraison.'}
                    {currentStep === 2 && 'Choisissez une adresse claire pour accélérer la livraison.'}
                    {currentStep === 3 && 'Dernière étape : choisissez le paiement et confirmez la commande.'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Barème local AGRIKIRI : moins de 1 tonne (2202 Lbs) = 10%, entre 1 et 5 tonnes = 5%, plus de 5 tonnes = gratuit.
                  </p>
                </div>

                {isAuthenticated && canContinueToPayment && (
                  <div className="mt-5 rounded-2xl border border-agri-green-100 bg-agri-green-50 p-4 text-sm text-agri-dark">
                    <p className="font-semibold mb-1">Adresse active</p>
                    <p>{activeAddress.fullName}</p>
                    <p>{formatPhoneForDisplay(activeAddress.phoneCountryCode, activeAddress.phoneNumber)}</p>
                    <p>{activeAddress.addressLine1}</p>
                    <p>{activeAddress.city}, {activeAddress.stateRegion}</p>
                  </div>
                )}

                <div className="mt-5">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      if (currentStep === 1) {
                        if (!isAuthenticated) {
                          router.push('/login?next=%2Fcart%3Fcheckout%3D1');
                          return;
                        }
                        setCurrentStep(2);
                        return;
                      }

                      if (currentStep === 2) {
                        if (!canContinueToPayment) {
                          if (!selectedSavedAddress) {
                            setAddressErrors(validateAddressFields(deliveryAddress));
                          }
                          toast.error('Complétez votre adresse avant de continuer.');
                          return;
                        }
                        setCurrentStep(3);
                        return;
                      }

                      void handleCheckout();
                    }}
                    loading={currentStep === 3 && isSubmitting}
                  >
                    {currentStep === 1 ? 'Commencer le checkout' : currentStep === 2 ? 'Continuer vers le paiement' : 'Confirmer maintenant'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-agri-cream flex flex-col">
        <Navbar />
        <div className="container-agri py-32 flex-1 flex items-center justify-center">
          <div className="text-lg text-gray-500">Préparation du checkout...</div>
        </div>
        <Footer />
      </div>
    }>
      <CartPageContent />
    </Suspense>
  );
}
