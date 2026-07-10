'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Button from '@/components/ui/Button';
import { getAdminProducts, getCategories, Product, ProductVariant } from '@/lib/services/products';
import { getUsersList } from '@/lib/services/admin';
import {
  convertPosProformaToInvoice,
  createPosSale,
  downloadPosDocument,
  listPosSales,
  PosCustomerType,
  PosDocumentType,
  PosSale,
  PaymentMethod,
} from '@/lib/services/pos';
import { createPosSaleDeliveryNote } from '@/lib/services/delivery-notes';

type CartLine = {
  key: string;
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
};

const DOCUMENT_OPTIONS: Array<{ value: PosDocumentType; label: string; description: string }> = [
  { value: 'RECEIPT', label: 'Reçu', description: 'Pour une vente encaissée immédiatement.' },
  { value: 'INVOICE', label: 'Facture', description: 'Pour une vente POS formelle avec règlement déjà acté.' },
  { value: 'PROFORMA', label: 'Proforma', description: 'Pour préparer une offre sans sortie de stock.' },
];

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'CASH' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT_BANCAIRE', label: 'Virement bancaire' },
  { value: 'MONCASH', label: 'MonCash' },
  { value: 'PLOPPLOP', label: 'PLOP PLOP' },
  { value: 'NATCASH', label: 'NatCash' },
  { value: 'KASHPAW', label: 'Kashpaw' },
];

const CUSTOMER_TYPE_OPTIONS: Array<{ value: PosCustomerType; label: string; hint: string }> = [
  { value: 'WALK_IN', label: 'Walk-in customer', hint: 'Client comptoir sans fiche détaillée.' },
  { value: 'INDIVIDUAL', label: 'Individu', hint: 'Client personne physique avec coordonnées.' },
  { value: 'BUSINESS', label: 'Entreprise', hint: 'Client société avec nom d’entreprise.' },
];

function formatCurrency(amount: number | string | null | undefined) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} HTG`;
}

function getPosDeliveryEstimate(subtotalAmount: number, totalWeightLbs: number, deliveryRequested: boolean) {
  const oneTonLbs = 2202;
  const fiveTonsLbs = oneTonLbs * 5;

  if (!deliveryRequested) {
    return {
      cost: 0,
      label: '0 HTG',
      note: 'Aucune livraison ajoutée à cette vente POS.',
      ruleLabel: 'Comptoir',
    };
  }

  if (totalWeightLbs > fiveTonsLbs) {
    return {
      cost: 0,
      label: '0 HTG',
      note: 'Plus de 5 tonnes: livraison gratuite.',
      ruleLabel: 'Gratuit',
    };
  }

  if (totalWeightLbs >= oneTonLbs) {
    const cost = Number((subtotalAmount * 0.05).toFixed(2));
    return {
      cost,
      label: formatCurrency(cost),
      note: 'Entre 1 et 5 tonnes: transport à 5% du montant.',
      ruleLabel: '5% transport',
    };
  }

  const cost = Number((subtotalAmount * 0.1).toFixed(2));
  return {
    cost,
    label: formatCurrency(cost),
    note: 'Moins de 1 tonne: transport à 10% du montant.',
    ruleLabel: '10% transport',
  };
}

function resolveTieredUnitPrice(variant: ProductVariant | null, product: Product, quantity: number) {
  if (variant) {
    const tiers = (variant.pricingTiers || [])
      .slice()
      .sort((a, b) => a.minQuantity - b.minQuantity);
    const matchedTier = tiers.find(
      (tier) => quantity >= tier.minQuantity && (tier.maxQuantity == null || quantity <= tier.maxQuantity)
    );
    return Number(matchedTier?.price ?? variant.price);
  }

  return Number(product.price);
}

function buildCartKey(productId: string, productVariantId?: string | null) {
  return `${productId}:${productVariantId || 'base'}`;
}

function pickDefaultVariant(product: Product) {
  if (!product.variants?.length) return null;
  return product.variants.find((variant) => variant.isDefault) || product.variants[0];
}

export default function AdminPosPage() {
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [desktopWorkspaceHeight, setDesktopWorkspaceHeight] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockOnly, setStockOnly] = useState(true);
  const [documentType, setDocumentType] = useState<PosDocumentType>('RECEIPT');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [customerType, setCustomerType] = useState<PosCustomerType>('WALK_IN');
  const [customerName, setCustomerName] = useState('Client comptoir');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryRequested, setDeliveryRequested] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  const [quickQuantities, setQuickQuantities] = useState<Record<string, number>>({});
  const [lastCreatedSale, setLastCreatedSale] = useState<PosSale | null>(null);
  const [selectedDeliverySale, setSelectedDeliverySale] = useState<PosSale | null>(null);
  const [selectedProforma, setSelectedProforma] = useState<PosSale | null>(null);
  const [proformaPaymentMethod, setProformaPaymentMethod] = useState<PaymentMethod>('CASH');
  const [deliveryNoteDraft, setDeliveryNoteDraft] = useState<{
    deliveryAgentId: string;
    notes: string;
    lineQuantities: Record<string, string>;
  }>({
    deliveryAgentId: '',
    notes: '',
    lineQuantities: {},
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.metaKey || event.ctrlKey || event.altKey)) {
        const target = event.target as HTMLElement | null;
        const isTypingField =
          target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.getAttribute('contenteditable') === 'true';
        if (!isTypingField) {
          event.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const updateWorkspaceHeight = () => {
      if (typeof window === 'undefined') return;

      if (window.innerWidth < 1280 || !heroSectionRef.current) {
        setDesktopWorkspaceHeight(null);
        return;
      }

      const heroBottom = heroSectionRef.current.getBoundingClientRect().bottom;
      const availableHeight = window.innerHeight - heroBottom - 24;

      setDesktopWorkspaceHeight(Math.max(520, Math.floor(availableHeight)));
    };

    updateWorkspaceHeight();
    window.addEventListener('resize', updateWorkspaceHeight);

    return () => window.removeEventListener('resize', updateWorkspaceHeight);
  }, []);

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['admin-products-pos'],
    queryFn: () => getAdminProducts({ limit: 200 }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-pos-categories'],
    queryFn: getCategories,
  });

  const { data: recentSales = [], isLoading: isRecentSalesLoading } = useQuery({
    queryKey: ['admin-pos-sales'],
    queryFn: listPosSales,
  });
  const { data: deliveryAgentsData } = useQuery({
    queryKey: ['delivery-agents-pos'],
    queryFn: () => getUsersList(1, 100, '', 'DELIVERY_AGENT'),
  });

  const createSaleMutation = useMutation({
    mutationFn: createPosSale,
    onSuccess: (sale) => {
      toast.success(`Document ${sale.saleNumber} créé avec succès.`);
      setLastCreatedSale(sale);
      setCartLines([]);
      setDiscountAmount('0');
      setNotes('');
      setCustomerType('WALK_IN');
      setCustomerName('Client comptoir');
      setCompanyName('');
      setTaxId('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setDeliveryRequested(false);
      queryClient.invalidateQueries({ queryKey: ['admin-pos-sales'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de créer ce document POS.');
    },
  });
  const createDeliveryNoteMutation = useMutation({
    mutationFn: ({ posSaleId, payload }: { posSaleId: string; payload: Parameters<typeof createPosSaleDeliveryNote>[1] }) =>
      createPosSaleDeliveryNote(posSaleId, payload),
    onSuccess: () => {
      toast.success('Bon de livraison POS créé');
      setSelectedDeliverySale(null);
      setDeliveryNoteDraft({ deliveryAgentId: '', notes: '', lineQuantities: {} });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de créer ce bon de livraison POS.');
    },
  });
  const convertProformaMutation = useMutation({
    mutationFn: ({ saleId, paymentMethod }: { saleId: string; paymentMethod: PaymentMethod }) =>
      convertPosProformaToInvoice(saleId, paymentMethod),
    onSuccess: (sale) => {
      toast.success(`Proforma transformée en facture ${sale.saleNumber}.`);
      setSelectedProforma(null);
      setProformaPaymentMethod('CASH');
      setLastCreatedSale(sale);
      queryClient.invalidateQueries({ queryKey: ['admin-pos-sales'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Impossible de transformer cette proforma en facture.');
    },
  });

  const filteredProducts = useMemo(() => {
      const products = productsData?.products || [];
    return products.filter((product) => {
      const matchesSearch =
        !deferredSearch ||
        product.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        product.category?.name?.toLowerCase().includes(deferredSearch.toLowerCase());
      const matchesCategory = !categoryFilter || product.categoryId === categoryFilter;
      const stockCount = product.variants?.length
        ? product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
        : product.stockQuantity;
      const matchesStock = !stockOnly || stockCount > 0;
      return product.isActive && matchesSearch && matchesCategory && matchesStock;
    });
  }, [productsData?.products, deferredSearch, categoryFilter, stockOnly]);

  const cartUnits = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const totalWeightLbs = cartLines.reduce((sum, line) => {
    const unitWeight = Number(line.variant?.weightLbs ?? line.product.weightLbs ?? 0);
    return sum + unitWeight * line.quantity;
  }, 0);
  const deliveryAgents = deliveryAgentsData?.users || [];
  const visibleProductsCount = filteredProducts.length;

  const subtotalAmount = cartLines.reduce((sum, line) => {
    const unitPrice = resolveTieredUnitPrice(line.variant, line.product, line.quantity);
    return sum + unitPrice * line.quantity;
  }, 0);
  const discountValue = Math.max(0, Number(discountAmount) || 0);
  const discountedSubtotal = Math.max(0, subtotalAmount - discountValue);
  const deliveryEstimate = getPosDeliveryEstimate(discountedSubtotal, totalWeightLbs, deliveryRequested);
  const totalAmount = Math.max(0, discountedSubtotal + deliveryEstimate.cost);

  const handleAddProduct = (product: Product) => {
    const selectedVariantId = variantSelections[product.id];
    const variant =
      product.variants?.find((item) => item.id === selectedVariantId) ||
      pickDefaultVariant(product) ||
      null;
    const stock = variant ? variant.stockQuantity : product.stockQuantity;
    const quantity = Math.max(1, quickQuantities[product.id] || 1);

    if (stock <= 0) {
      toast.error('Ce produit est en rupture pour le POS.');
      return;
    }

    if (quantity > stock) {
      toast.error(`Stock disponible: ${stock}`);
      return;
    }

    const key = buildCartKey(product.id, variant?.id);

    setCartLines((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        const nextQuantity = existing.quantity + quantity;
        if (nextQuantity > stock) {
          toast.error(`Stock disponible: ${stock}`);
          return current;
        }
        return current.map((line) => (line.key === key ? { ...line, quantity: nextQuantity } : line));
      }

      return [...current, { key, product, variant, quantity }];
    });
  };

  const updateCartLineQuantity = (key: string, nextQuantity: number) => {
    setCartLines((current) =>
      current
        .map((line) => {
          if (line.key !== key) return line;
          const stock = line.variant ? line.variant.stockQuantity : line.product.stockQuantity;
          return { ...line, quantity: Math.min(Math.max(nextQuantity, 1), stock) };
        })
        .filter((line) => line.quantity > 0)
    );
  };

  const removeCartLine = (key: string) => {
    setCartLines((current) => current.filter((line) => line.key !== key));
  };

  const handleCreateSale = () => {
    if (!cartLines.length) {
      toast.error('Ajoute au moins un article au panier POS.');
      return;
    }

    if (!customerName.trim()) {
      toast.error('Le nom du client est requis.');
      return;
    }

    if (customerType === 'BUSINESS' && !companyName.trim()) {
      toast.error('Le nom de l’entreprise est requis.');
      return;
    }

    if (deliveryRequested && !customerAddress.trim()) {
      toast.error('Ajoute une adresse de livraison pour cette vente POS.');
      return;
    }

    if (documentType !== 'PROFORMA' && !paymentMethod) {
      toast.error('Choisis un mode de paiement.');
      return;
    }

    createSaleMutation.mutate({
      documentType,
      customerType,
      customerName: customerName.trim(),
      companyName: companyName.trim() || null,
      taxId: taxId.trim() || null,
      customerPhone: customerPhone.trim() || null,
      customerEmail: customerEmail.trim() || null,
      customerAddress: customerAddress.trim() || null,
      deliveryRequested,
      paymentMethod: documentType === 'PROFORMA' ? null : paymentMethod,
      discountAmount: discountValue,
      notes: notes.trim() || null,
      items: cartLines.map((line) => ({
        productId: line.product.id,
        productVariantId: line.variant?.id || null,
        description: line.variant ? `${line.product.name} - ${line.variant.label}` : line.product.name,
        quantity: line.quantity,
      })),
    });
  };

  const handleDownload = async (saleId: string, type: PosDocumentType) => {
    try {
      const blob = await downloadPosDocument(saleId, type);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type.toLowerCase()}-${saleId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type === 'RECEIPT' ? 'Reçu' : type === 'INVOICE' ? 'Facture' : 'Proforma'} téléchargé.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible de télécharger ce document.');
    }
  };

  const openDeliveryNotePanel = (sale: PosSale) => {
    setSelectedDeliverySale(sale);
    setDeliveryNoteDraft({
      deliveryAgentId: '',
      notes: '',
      lineQuantities: Object.fromEntries((sale.items || []).map((item) => [item.id, ''])),
    });
  };

  const openConvertProformaPanel = (sale: PosSale) => {
    setSelectedProforma(sale);
    setProformaPaymentMethod('CASH');
  };

  const handleConvertProforma = () => {
    if (!selectedProforma) return;

    convertProformaMutation.mutate({
      saleId: selectedProforma.id,
      paymentMethod: proformaPaymentMethod,
    });
  };

  const handleCreatePosDeliveryNote = () => {
    if (!selectedDeliverySale) return;

    const preparedItems = (selectedDeliverySale.items || [])
      .map((item) => ({
        posSaleItemId: item.id,
        deliveredQuantity: Number(deliveryNoteDraft.lineQuantities[item.id] || 0),
      }))
      .filter((item) => item.deliveredQuantity > 0);

    if (preparedItems.length === 0) {
      toast.error('Indique au moins une quantité à livrer sur ce passage.');
      return;
    }

    createDeliveryNoteMutation.mutate({
      posSaleId: selectedDeliverySale.id,
      payload: {
        deliveryAgentId: deliveryNoteDraft.deliveryAgentId || null,
        customerName: selectedDeliverySale.customerName,
        customerPhone: selectedDeliverySale.customerPhone || null,
        customerAddress: selectedDeliverySale.customerAddress || null,
        notes: deliveryNoteDraft.notes.trim() || null,
        status: 'PREPARED',
        items: preparedItems,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f4ec] flex">
      <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((current) => !current)} />

      <main className={`flex-1 p-4 md:p-6 lg:p-8 transition-[margin] duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="mx-auto max-w-[1720px] space-y-6">
          <section
            ref={heroSectionRef}
            className="rounded-[28px] border border-[#f3dfd6] bg-gradient-to-r from-[#fff7f2] via-[#fffdfb] to-[#f8fbf6] p-4 shadow-[0_18px_60px_rgba(217,142,107,0.10)] md:p-5"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(540px,1fr)] xl:items-center">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0ea] px-4 py-2 text-sm font-semibold text-[#db5f4f]">
                    <span>🧾</span> AGRIKIRI Point of Sale
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed((current) => !current)}
                    className="hidden lg:inline-flex items-center gap-2 rounded-full border border-[#ecd7cb] bg-white px-4 py-2 text-sm font-semibold text-[#4c5b58] transition-colors hover:bg-[#fff8f4]"
                  >
                    <span>{sidebarCollapsed ? '⇢' : '⇠'}</span>
                    {sidebarCollapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
                  </button>
                </div>
                <h1 className="mt-3 font-display text-2xl text-agri-dark md:text-[2rem]">Mini POS comptoir</h1>
                <p className="mt-2 max-w-2xl text-sm text-[#6c7284] md:text-base">
                  Catalogue à gauche, facture à droite, documents AGRIKIRI prêts à imprimer.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#7d7f8c] md:text-sm">
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">`/` pour rechercher</span>
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">Proforma → Facture</span>
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">Bons de livraison</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:justify-self-end xl:min-w-[540px]">
                <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#b18d7e]">Articles</div>
                  <div className="mt-1 text-2xl font-bold text-agri-dark">{cartLines.length}</div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#b18d7e]">Unités</div>
                  <div className="mt-1 text-2xl font-bold text-agri-dark">{cartUnits}</div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#b18d7e]">Catalogue</div>
                  <div className="mt-1 text-2xl font-bold text-agri-dark">{visibleProductsCount}</div>
                </div>
                <div className="rounded-2xl border border-[#ffd6cc] bg-[#fff2ee] px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#db7a69]">Total</div>
                  <div className="mt-1 text-2xl font-bold text-[#e35e52]">{formatCurrency(totalAmount)}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#e8e1d3] bg-white/95 p-5 shadow-lg md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-agri-green-600">Historique visible</p>
                <h2 className="mt-2 font-display text-3xl text-agri-dark">Ventes POS effectuées</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Toutes les ventes POS récentes apparaissent ici avec téléchargement rapide et actions de suivi.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-[#f7f4ec] px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#9b8d80]">Total</div>
                  <div className="mt-1 text-2xl font-bold text-agri-dark">{recentSales.length}</div>
                </div>
                <div className="rounded-2xl bg-[#eef8ec] px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-agri-green-700/70">Reçus</div>
                  <div className="mt-1 text-2xl font-bold text-agri-dark">
                    {recentSales.filter((sale) => sale.documentType === 'RECEIPT').length}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#fff4ef] px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#db7a69]">Factures</div>
                  <div className="mt-1 text-2xl font-bold text-agri-dark">
                    {recentSales.filter((sale) => sale.documentType === 'INVOICE').length}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#f4f1ff] px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#7a6ab8]">Proformas</div>
                  <div className="mt-1 text-2xl font-bold text-agri-dark">
                    {recentSales.filter((sale) => sale.documentType === 'PROFORMA').length}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3 lg:hidden">
              {isRecentSalesLoading ? (
                [...Array(3)].map((_, index) => (
                  <div key={index} className="h-28 rounded-[20px] bg-[#f4f1e8] animate-pulse" />
                ))
              ) : recentSales.length ? (
                recentSales.map((sale) => (
                  <div key={sale.id} className="rounded-[22px] border border-[#ebe2d4] bg-[#fcfbf8] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-agri-green-700/70">
                          {sale.documentType === 'RECEIPT' ? 'Reçu' : sale.documentType === 'INVOICE' ? 'Facture' : 'Proforma'}
                        </div>
                        <div className="mt-1 font-bold text-agri-dark">{sale.saleNumber}</div>
                        <div className="mt-1 text-sm text-gray-600">{sale.customerName}</div>
                        <div className="text-xs text-gray-400">{new Date(sale.createdAt).toLocaleString('fr-FR')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Total</div>
                        <div className="font-bold text-agri-green-700">{formatCurrency(sale.totalAmount)}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(['RECEIPT', 'INVOICE', 'PROFORMA'] as PosDocumentType[]).map((type) => (
                        <Button
                          key={type}
                          variant={type === sale.documentType ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleDownload(sale.id, type)}
                        >
                          {type === 'RECEIPT' ? 'Reçu' : type === 'INVOICE' ? 'Facture' : 'Proforma'}
                        </Button>
                      ))}
                      {sale.documentType === 'PROFORMA' ? (
                        <Button variant="primary" size="sm" onClick={() => openConvertProformaPanel(sale)}>
                          Transformer
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#d8cfbf] bg-[#fcfbf8] p-8 text-center text-gray-500">
                  Aucune vente POS affichée pour le moment.
                </div>
              )}
            </div>

            <div className="mt-5 hidden overflow-x-auto lg:block">
              <table className="min-w-full overflow-hidden rounded-[22px] border border-[#ebe2d4]">
                <thead className="bg-[#faf7f2]">
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-[#9b8d80]">
                    <th className="px-4 py-3">N° vente</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Paiement</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebe2d4] bg-white">
                  {isRecentSalesLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Chargement des ventes POS...
                      </td>
                    </tr>
                  ) : recentSales.length ? (
                    recentSales.map((sale) => (
                      <tr key={sale.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="font-bold text-agri-dark">{sale.saleNumber}</div>
                          <div className="text-xs text-gray-400">{sale.status}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {sale.documentType === 'RECEIPT' ? 'Reçu' : sale.documentType === 'INVOICE' ? 'Facture' : 'Proforma'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-agri-dark">{sale.customerName}</div>
                          <div className="text-xs text-gray-400">{sale.customerPhone || sale.customerEmail || 'Client comptoir'}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{sale.paymentMethod || 'N/A'}</td>
                        <td className="px-4 py-4 font-bold text-agri-green-700">{formatCurrency(sale.totalAmount)}</td>
                        <td className="px-4 py-4 text-sm text-gray-500">{new Date(sale.createdAt).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {(['RECEIPT', 'INVOICE', 'PROFORMA'] as PosDocumentType[]).map((type) => (
                              <Button
                                key={type}
                                variant={type === sale.documentType ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => handleDownload(sale.id, type)}
                              >
                                {type === 'RECEIPT' ? 'Reçu' : type === 'INVOICE' ? 'Facture' : 'Proforma'}
                              </Button>
                            ))}
                            {sale.documentType === 'PROFORMA' ? (
                              <Button variant="primary" size="sm" onClick={() => openConvertProformaPanel(sale)}>
                                Transformer
                              </Button>
                            ) : null}
                            <Button variant="secondary" size="sm" onClick={() => openDeliveryNotePanel(sale)}>
                              Bon livraison
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Aucune vente POS affichée pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div
            className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(460px,0.98fr)] xl:min-h-0"
            style={desktopWorkspaceHeight ? { height: `${desktopWorkspaceHeight}px` } : undefined}
          >
            <section className="rounded-[28px] border border-[#f0e4dd] bg-gradient-to-b from-[#fff8f5] to-[#fffdfb] p-5 md:p-6 shadow-[0_18px_50px_rgba(214,177,160,0.14)] xl:flex xl:min-h-0 xl:flex-col">
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-2xl text-agri-dark">Menu</h2>
                  <p className="mt-1 text-sm text-[#74778a]">Recherche rapide, catalogue clair, ajout au panier sans friction.</p>
                </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(220px,280px)_220px] lg:items-center">
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Rechercher un produit... (/)"
                      className="w-full rounded-2xl border border-[#eadad1] bg-white px-4 py-3 pr-12 outline-none transition-colors focus:border-[#eb8f7a]"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#b3a39b]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M21 21L16.65 16.65M18 10.5C18 14.6421 14.6421 18 10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="w-full rounded-2xl border border-[#eadad1] bg-white px-4 py-3 outline-none transition-colors focus:border-[#eb8f7a]"
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setStockOnly((current) => !current)}
                    className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                      stockOnly ? 'bg-[#2f8630] text-white shadow-[0_12px_30px_rgba(47,134,48,0.18)]' : 'border border-[#eadad1] bg-white text-[#666a7a]'
                    }`}
                  >
                    {stockOnly ? 'En stock seulement' : 'Afficher tout'}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    categoryFilter === '' ? 'bg-[#111111] text-white' : 'bg-[#f5f0e7] text-[#5f6473]'
                  }`}
                >
                  Tous
                </button>
                {categories.slice(0, 6).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryFilter(category.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      categoryFilter === category.id ? 'bg-[#ea6a52] text-white' : 'bg-[#f5f0e7] text-[#5f6473]'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="mt-6 grid auto-rows-max items-start gap-4 md:grid-cols-2 2xl:grid-cols-3 xl:min-h-0 xl:content-start xl:overflow-y-auto xl:pr-2">
                {isProductsLoading ? (
                  [...Array(6)].map((_, index) => (
                    <div key={index} className="overflow-hidden rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] shadow-sm">
                      <div className="aspect-[4/3] animate-pulse bg-[#f1eadc]" />
                      <div className="space-y-3 p-4">
                        <div className="h-5 w-3/4 animate-pulse rounded-full bg-[#f4f1e8]" />
                        <div className="h-4 w-1/2 animate-pulse rounded-full bg-[#f4f1e8]" />
                        <div className="h-11 w-full animate-pulse rounded-2xl bg-[#f4f1e8]" />
                        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                          <div className="h-11 animate-pulse rounded-2xl bg-[#f4f1e8]" />
                          <div className="h-11 w-28 animate-pulse rounded-2xl bg-[#f4f1e8]" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const selectedVariantId = variantSelections[product.id];
                    const variant =
                      product.variants?.find((item) => item.id === selectedVariantId) ||
                      pickDefaultVariant(product) ||
                      null;
                    const stock = variant ? variant.stockQuantity : product.stockQuantity;
                    const quickQuantity = quickQuantities[product.id] || 1;
                    const estimatedUnitPrice = resolveTieredUnitPrice(variant, product, quickQuantity);
                    const primaryImage = product.images?.[0]?.url;

                    return (
                      <article
                        key={product.id}
                        className="self-start overflow-hidden rounded-[24px] border border-[#f0e4dd] bg-white shadow-[0_12px_28px_rgba(213,183,170,0.12)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_32px_rgba(213,183,170,0.18)]"
                      >
                        <div className="aspect-[4/3] bg-gradient-to-br from-[#fff2dc] to-[#ffe8e3]">
                          {primaryImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-5xl text-agri-green-700/50">🌾</div>
                          )}
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.2em] text-agri-green-700/70">
                                {product.category?.name || 'Catalogue'}
                              </div>
                              <h3 className="mt-1 text-lg font-bold text-agri-dark leading-tight">{product.name}</h3>
                            </div>
                            <div className="rounded-full bg-[#f6f0ea] px-3 py-1 text-xs font-semibold text-[#93919d]">
                              Stock: {stock}
                            </div>
                          </div>

                          {product.variants?.length ? (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Format</label>
                              <select
                                value={variant?.id || ''}
                                onChange={(event) =>
                                  setVariantSelections((current) => ({ ...current, [product.id]: event.target.value }))
                                }
                                className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                              >
                                {product.variants.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.label} · {formatCurrency(item.price)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}

                          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Quantité</span>
                              <input
                                type="number"
                                min={1}
                                max={stock}
                                value={quickQuantity}
                                onChange={(event) =>
                                  setQuickQuantities((current) => ({
                                    ...current,
                                    [product.id]: Math.max(1, Number(event.target.value) || 1),
                                  }))
                                }
                                className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                              />
                            </label>
                            <Button
                              onClick={() => handleAddProduct(product)}
                              className="h-[52px] !px-5"
                              disabled={stock <= 0}
                            >
                              + Ajouter
                            </Button>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-xl font-bold text-[#e65353]">{formatCurrency(estimatedUnitPrice)}</span>
                            {variant?.pricingTiers?.length ? (
                              <span className="rounded-full bg-[#f6f0ea] px-3 py-1 text-xs font-medium text-[#7e7a87]">Tarifs dégressifs</span>
                            ) : (
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${stock > 0 ? 'bg-[#eef8ec] text-[#2f8630]' : 'bg-red-50 text-red-500'}`}>
                                {stock > 0 ? 'Disponible' : 'Rupture'}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="md:col-span-2 rounded-[24px] border border-dashed border-[#d6cdbd] bg-[#fcfbf8] p-10 text-center text-gray-500">
                    Aucun produit ne correspond à ce filtre.
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-6 self-start xl:h-full xl:min-h-0 xl:overflow-y-auto xl:pr-2">
              <div className="rounded-[28px] border border-[#f0e4dd] bg-white/95 p-5 shadow-[0_18px_50px_rgba(213,183,170,0.14)] md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl text-agri-dark">Facture</h2>
                    <p className="mt-1 text-sm text-[#74778a]">Prépare le document puis finalise la vente en un clic.</p>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      cartLines.length ? 'bg-[#edf8ef] text-[#2f8630]' : 'bg-[#f5f0e7] text-[#6b7280]'
                    }`}
                  >
                    {cartLines.length ? 'En cours' : 'Panier vide'}
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] border border-[#f1ebe5] bg-[#faf7f2] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#a48b7c]">Client</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-2 text-sm font-medium text-[#4f5565] shadow-sm">
                      {customerName || 'Client anonyme'}
                    </span>
                    {customerType === 'WALK_IN' ? (
                      <span className="rounded-full bg-[#edf1f7] px-3 py-2 text-sm font-medium text-[#596173]">
                        Client anonyme (Walking Customer)
                      </span>
                    ) : null}
                  </div>
                </div>

                {cartLines.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCartLines([])}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Vider le panier
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerType('WALK_IN');
                        setCustomerName('Client comptoir');
                        setCompanyName('');
                        setTaxId('');
                        setCustomerPhone('');
                        setCustomerEmail('');
                        setCustomerAddress('');
                        setDeliveryRequested(false);
                      }}
                      className="rounded-full bg-[#f4f1e8] px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-[#ece5d8] transition-colors"
                    >
                      Reset client
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 space-y-3">
                  {cartLines.length ? (
                    cartLines.map((line) => {
                      const unitPrice = resolveTieredUnitPrice(line.variant, line.product, line.quantity);
                      const lineTotal = unitPrice * line.quantity;
                      const stock = line.variant ? line.variant.stockQuantity : line.product.stockQuantity;
                      const image = line.product.images?.[0]?.url;

                      return (
                        <div key={line.key} className="rounded-[22px] border border-[#ebe2d4] bg-[#fcfbf8] p-4">
                          <div className="flex gap-4">
                            <div className="h-16 w-16 rounded-2xl bg-[#f1eadc] overflow-hidden shrink-0">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={image} alt={line.product.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-2xl text-agri-green-700/50">🌾</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="font-semibold text-agri-dark leading-tight">{line.product.name}</h3>
                                  <p className="text-sm text-gray-500">
                                    {line.variant?.label || 'Format standard'} · {formatCurrency(unitPrice)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeCartLine(line.key)}
                                  className="text-sm font-semibold text-red-500 hover:text-red-600"
                                >
                                  Retirer
                                </button>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-3">
                                <div className="inline-flex items-center rounded-2xl border border-[#e5dccb] bg-white overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => updateCartLineQuantity(line.key, line.quantity - 1)}
                                    className="px-3 py-2 text-lg text-gray-500 hover:bg-[#f4f1e8] transition-colors"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    max={stock}
                                    value={line.quantity}
                                    onChange={(event) => updateCartLineQuantity(line.key, Number(event.target.value) || 1)}
                                    className="w-16 border-x border-[#e5dccb] bg-white px-2 py-2 text-center outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateCartLineQuantity(line.key, line.quantity + 1)}
                                    className="px-3 py-2 text-lg text-gray-500 hover:bg-[#f4f1e8] transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Montant</div>
                                  <div className="font-bold text-agri-green-700">{formatCurrency(lineTotal)}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-[#d8cfbf] bg-[#fcfbf8] p-8 text-center text-gray-500">
                      Ajoute des produits à gauche pour démarrer une vente POS.
                    </div>
                  )}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Type client</span>
                    <select
                      value={customerType}
                      onChange={(event) => {
                        const nextType = event.target.value as PosCustomerType;
                        setCustomerType(nextType);
                        if (nextType === 'WALK_IN') {
                          setCustomerName('Client comptoir');
                          setCompanyName('');
                          setTaxId('');
                          setCustomerEmail('');
                          setCustomerAddress('');
                        }
                      }}
                      className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                    >
                      {CUSTOMER_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">
                      {CUSTOMER_TYPE_OPTIONS.find((option) => option.value === customerType)?.hint}
                    </p>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Type de document</span>
                    <select
                      value={documentType}
                      onChange={(event) => setDocumentType(event.target.value as PosDocumentType)}
                      className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                    >
                      {DOCUMENT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">
                      {DOCUMENT_OPTIONS.find((option) => option.value === documentType)?.description}
                    </p>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Mode de paiement</span>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_OPTIONS.map((option) => {
                        const isActive = paymentMethod === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            disabled={documentType === 'PROFORMA'}
                            onClick={() => setPaymentMethod(option.value)}
                            className={`rounded-2xl px-3 py-3 text-sm font-semibold transition-colors ${
                              documentType === 'PROFORMA'
                                ? 'cursor-not-allowed border border-[#ece5dc] bg-[#f5f2ec] text-[#b6afa7]'
                                : isActive
                                  ? 'bg-gradient-to-r from-[#1f6a33] to-[#2f8630] text-white shadow-[0_12px_24px_rgba(47,134,48,0.18)]'
                                  : 'border border-[#ece5dc] bg-[#f7f7f5] text-[#4f5565] hover:bg-white'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500">
                      {documentType === 'PROFORMA'
                        ? 'Le mode de paiement sera choisi au moment de transformer la proforma en facture.'
                        : 'Sélectionne le moyen de paiement de cette vente.'}
                    </p>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Livraison</span>
                    <button
                      type="button"
                      onClick={() => setDeliveryRequested((current) => !current)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                        deliveryRequested
                          ? 'border-agri-green-500 bg-agri-green-50 text-agri-green-800'
                          : 'border-[#e5dccb] bg-white text-gray-600'
                      }`}
                    >
                      <div className="font-semibold">
                        {deliveryRequested ? 'Incluse dans cette vente' : 'Vente comptoir sans livraison'}
                      </div>
                      <div className="mt-1 text-xs opacity-80">
                        {deliveryRequested ? deliveryEstimate.note : 'Activez ceci pour calculer le transport au poids.'}
                      </div>
                    </button>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Nom client</span>
                    <input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                    />
                  </label>

                  {customerType === 'BUSINESS' ? (
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Entreprise</span>
                      <input
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                      />
                    </label>
                  ) : null}

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Téléphone</span>
                    <input
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                      placeholder="+509..."
                      className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                    />
                  </label>

                  {customerType === 'BUSINESS' ? (
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Identifiant fiscal</span>
                      <input
                        value={taxId}
                        onChange={(event) => setTaxId(event.target.value)}
                        placeholder="NIF / Référence"
                        className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                      />
                    </label>
                  ) : null}

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Email</span>
                    <input
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      placeholder="client@email.com"
                      className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Remise</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={discountAmount}
                      onChange={(event) => setDiscountAmount(event.target.value)}
                      className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                    />
                  </label>
                </div>

                <label className="mt-4 block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Adresse / contexte client</span>
                  <textarea
                    value={customerAddress}
                    onChange={(event) => setCustomerAddress(event.target.value)}
                    rows={2}
                    className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                  />
                </label>

                <label className="mt-4 block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Notes internes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                  />
                </label>

                <div className="mt-6 rounded-[24px] border border-[#f3dedd] bg-gradient-to-b from-[#fff9f7] to-[#fff2ef] p-5 text-[#374151]">
                  <div className="flex items-center justify-between text-sm text-[#8a7a72]">
                    <span>Sous-total</span>
                    <span>{formatCurrency(subtotalAmount)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[#8a7a72]">
                    <span>Remise</span>
                    <span>{formatCurrency(discountValue)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[#8a7a72]">
                    <span>Poids total</span>
                    <span>
                      {totalWeightLbs.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      Lbs
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[#8a7a72]">
                    <span>Livraison</span>
                    <span>{deliveryEstimate.label}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[#f2ddd8] pt-4 text-2xl font-bold">
                    <span className="text-agri-dark">Total</span>
                    <span className="text-[#e65353]">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="mt-2 rounded-2xl bg-[#edf8ef] px-4 py-3 text-sm font-semibold text-[#3a9a53]">
                    {deliveryEstimate.note}
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    <Button
                      onClick={handleCreateSale}
                      loading={createSaleMutation.isPending}
                      className="!w-full !rounded-[18px] !bg-gradient-to-r !from-[#1f6a33] !to-[#2f8630] !text-white"
                    >
                      Générer le document POS
                    </Button>
                    <p className="text-xs text-[#8a7a72]">
                      Les proformas n’impactent pas le stock. Les reçus et factures décrémentent le stock réel.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#e8e1d3] bg-white/95 p-5 md:p-6 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl text-agri-dark">Documents récents</h2>
                    <p className="text-sm text-gray-500 mt-1">Télécharge reçu, facture ou proforma à la demande.</p>
                  </div>
                  {lastCreatedSale ? (
                    <div className="rounded-full bg-agri-green-50 px-3 py-1 text-xs font-semibold text-agri-green-700">
                      Dernier: {lastCreatedSale.saleNumber}
                    </div>
                  ) : null}
                </div>

                {lastCreatedSale ? (
                  <div className="mt-5 rounded-[22px] border border-agri-green-200 bg-agri-green-50/60 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-agri-green-700/70">Tout de suite</div>
                        <div className="mt-1 text-lg font-bold text-agri-dark">{lastCreatedSale.saleNumber}</div>
                        <div className="text-sm text-gray-600">{lastCreatedSale.customerName} · {formatCurrency(lastCreatedSale.totalAmount)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(['RECEIPT', 'INVOICE', 'PROFORMA'] as PosDocumentType[]).map((type) => (
                          <Button key={type} variant={type === 'PROFORMA' ? 'secondary' : 'primary'} size="sm" onClick={() => handleDownload(lastCreatedSale.id, type)}>
                            {type === 'RECEIPT' ? 'Reçu' : type === 'INVOICE' ? 'Facture' : 'Proforma'}
                          </Button>
                        ))}
                        {lastCreatedSale.documentType === 'PROFORMA' ? (
                          <Button variant="primary" size="sm" onClick={() => openConvertProformaPanel(lastCreatedSale)}>
                            Transformer en facture
                          </Button>
                        ) : null}
                        <Button variant="secondary" size="sm" onClick={() => openDeliveryNotePanel(lastCreatedSale)}>
                          Bon livraison
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 space-y-3">
                  {isRecentSalesLoading ? (
                    [...Array(4)].map((_, index) => <div key={index} className="h-28 rounded-[20px] bg-[#f4f1e8] animate-pulse" />)
                  ) : recentSales.length ? (
                    recentSales.map((sale) => (
                      <div key={sale.id} className="rounded-[22px] border border-[#ebe2d4] bg-[#fcfbf8] p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-agri-green-700/70">
                              {sale.documentType === 'RECEIPT' ? 'Reçu' : sale.documentType === 'INVOICE' ? 'Facture' : 'Proforma'}
                            </div>
                            <div className="mt-1 font-bold text-agri-dark">{sale.saleNumber}</div>
                            <div className="text-sm text-gray-600">
                              {sale.customerName} · {new Date(sale.createdAt).toLocaleString('fr-FR')}
                            </div>
                          </div>

                          <div className="flex flex-col items-start gap-3 md:items-end">
                            <div className="text-right">
                              <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Total</div>
                              <div className="font-bold text-agri-green-700">{formatCurrency(sale.totalAmount)}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(['RECEIPT', 'INVOICE', 'PROFORMA'] as PosDocumentType[]).map((type) => (
                                <Button
                                  key={type}
                                  variant={type === sale.documentType ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() => handleDownload(sale.id, type)}
                                >
                                  {type === 'RECEIPT' ? 'Reçu' : type === 'INVOICE' ? 'Facture' : 'Proforma'}
                                </Button>
                              ))}
                              {sale.documentType === 'PROFORMA' ? (
                                <Button variant="primary" size="sm" onClick={() => openConvertProformaPanel(sale)}>
                                  Transformer en facture
                                </Button>
                              ) : null}
                              <Button variant="secondary" size="sm" onClick={() => openDeliveryNotePanel(sale)}>
                                Bon livraison
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-[#d8cfbf] bg-[#fcfbf8] p-8 text-center text-gray-500">
                      Aucun document POS généré pour le moment.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {selectedProforma ? (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="mx-auto max-w-xl rounded-[28px] border border-white/40 bg-[#f6f4ee] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 md:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-agri-green-600">Conversion document</p>
                <h2 className="mt-2 font-display text-3xl text-agri-dark">Transformer en facture</h2>
                <p className="mt-2 text-sm text-gray-500">
                  La proforma <span className="font-semibold text-agri-dark">{selectedProforma.saleNumber}</span> va devenir une facture
                  officielle avec sortie de stock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProforma(null)}
                className="rounded-full border border-gray-200 bg-white px-3 py-2 text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-5 md:p-7">
              <div className="rounded-2xl border border-[#e5dccb] bg-white px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Client</div>
                <div className="mt-1 font-semibold text-agri-dark">{selectedProforma.customerName}</div>
                <div className="text-sm text-gray-500">{formatCurrency(selectedProforma.totalAmount)}</div>
              </div>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Mode de paiement de la facture</span>
                <select
                  value={proformaPaymentMethod}
                  onChange={(event) => setProformaPaymentMethod(event.target.value as PaymentMethod)}
                  className="w-full rounded-2xl border border-[#e5dccb] bg-white px-4 py-3 outline-none focus:border-agri-green-500"
                >
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <p className="text-sm text-gray-500">
                Cette action génère un vrai numéro de facture et décrémente le stock au moment de la conversion.
              </p>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setSelectedProforma(null)}>
                  Annuler
                </Button>
                <Button type="button" variant="primary" loading={convertProformaMutation.isPending} onClick={handleConvertProforma}>
                  Convertir en facture
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedDeliverySale ? (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="mx-auto max-w-4xl rounded-[28px] bg-[#f6f4ee] shadow-2xl border border-white/40">
            <div className="p-5 md:p-7 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-agri-green-600 font-semibold">Bon de livraison POS</p>
                <h2 className="font-display text-3xl text-agri-dark mt-2">{selectedDeliverySale.saleNumber}</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Prépare le chargement réel pour cette vente, avec quantités partielles si nécessaire.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeliverySale(null)}
                className="rounded-full bg-white px-3 py-2 text-gray-500 border border-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 md:p-7 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-agri-dark mb-2">Livreur assigné</label>
                  <select
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                    value={deliveryNoteDraft.deliveryAgentId}
                    onChange={(e) => setDeliveryNoteDraft((current) => ({ ...current, deliveryAgentId: e.target.value }))}
                  >
                    <option value="">Aucun livreur assigné</option>
                    {deliveryAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Client</div>
                  <div className="mt-1 font-semibold text-agri-dark">{selectedDeliverySale.customerName}</div>
                  <div className="text-sm text-gray-500">{selectedDeliverySale.customerAddress || 'Adresse non renseignée'}</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-gray-100 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Produit</th>
                      <th className="px-4 py-3">Vendu</th>
                      <th className="px-4 py-3">À livrer maintenant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDeliverySale.items.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <div className="font-medium text-agri-dark">{item.description}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-agri-dark">{item.quantity}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            max={item.quantity}
                            className="input max-w-[140px]"
                            value={deliveryNoteDraft.lineQuantities[item.id] || ''}
                            onChange={(e) =>
                              setDeliveryNoteDraft((current) => ({
                                ...current,
                                lineQuantities: { ...current.lineQuantities, [item.id]: e.target.value },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-sm font-semibold text-agri-dark mb-2">Notes du bon</label>
                <textarea
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-green-500"
                  rows={4}
                  placeholder="Ex: 15 sacs aujourd’hui, reste à livrer demain..."
                  value={deliveryNoteDraft.notes}
                  onChange={(e) => setDeliveryNoteDraft((current) => ({ ...current, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setSelectedDeliverySale(null)}>
                  Fermer
                </Button>
                <Button type="button" variant="primary" loading={createDeliveryNoteMutation.isPending} onClick={handleCreatePosDeliveryNote}>
                  Générer le bon
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
