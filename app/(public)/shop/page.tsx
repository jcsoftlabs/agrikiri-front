'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import CartQuickDrawer from '@/components/ui/CartQuickDrawer';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getProducts, getCategories } from '@/lib/services/products';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

function getMinimumDisplayPrice(product: any) {
  const activeVariants = (product.variants || []).filter((variant: any) => variant.isActive !== false);
  if (activeVariants.length === 0) {
    return Number(product.price);
  }

  return Math.min(
    ...activeVariants.flatMap((variant: any) => [
      Number(variant.price),
      ...((variant.pricingTiers || []).map((tier: any) => Number(tier.price))),
    ])
  );
}

function getDefaultVariant(product: any) {
  const activeVariants = (product.variants || []).filter((variant: any) => variant.isActive !== false);
  return activeVariants.find((variant: any) => variant.isDefault) ?? activeVariants[0] ?? null;
}

function getCardPricing(product: any) {
  const activeVariants = (product.variants || []).filter((variant: any) => variant.isActive !== false);
  const defaultVariant = getDefaultVariant(product);
  const defaultPrice = Number(defaultVariant?.price ?? product.price);
  const lowestPrice = getMinimumDisplayPrice(product);
  const hasTieredPricing = activeVariants.some((variant: any) => (variant.pricingTiers || []).length > 0);
  const hasMultipleFormats = activeVariants.length > 1;
  const hasPriceDifference = Math.abs(defaultPrice - lowestPrice) > 0.001;

  return {
    defaultVariant,
    defaultPrice,
    lowestPrice,
    hasTieredPricing,
    hasMultipleFormats,
    hasPriceDifference,
  };
}

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState(''); // empty for 'Tous'
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<'all' | 'under-500' | '500-1000' | '1000-plus'>('all');
  const [weightRange, setWeightRange] = useState<'all' | 'under-2' | '2-5' | '5-plus'>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [drawerState, setDrawerState] = useState<{
    open: boolean;
    productName?: string;
    variantLabel?: string;
    quantity?: number;
  }>({ open: false });
  const addItem = useCartStore((state) => state.addItem);
  const PAGE_SIZE = 12;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get('search') || '');
    setActiveCategory(params.get('category') || '');
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, activeCategory, sortBy, showInStockOnly, priceRange, weightRange, formatFilter]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', { search, activeCategory, sortBy, page }],
    queryFn: () =>
      getProducts({
        search,
        categoryId: activeCategory || undefined,
        sort: sortBy,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const fetchedProducts = productsData?.products || [];
  const products = fetchedProducts
    .filter((product) => {
      if (!showInStockOnly) return true;

      const activeVariants = (product.variants || []).filter((variant) => variant.isActive !== false);
      if (activeVariants.length > 0) {
        return activeVariants.some((variant) => variant.stockQuantity > 0);
      }
      return product.stockQuantity > 0;
    })
    .filter((product) => {
      if (priceRange === 'all') return true;
      const minPrice = getMinimumDisplayPrice(product);

      if (priceRange === 'under-500') return minPrice < 500;
      if (priceRange === '500-1000') return minPrice >= 500 && minPrice <= 1000;
      return minPrice > 1000;
    })
    .filter((product) => {
      if (weightRange === 'all') return true;
      const activeVariants = (product.variants || []).filter((variant) => variant.isActive !== false);
      const weights = activeVariants.map((variant) => Number(variant.weightLbs));
      const minWeight = weights.length > 0 ? Math.min(...weights) : Number(product.weightLbs);

      if (weightRange === 'under-2') return minWeight < 2;
      if (weightRange === '2-5') return minWeight >= 2 && minWeight <= 5;
      return minWeight > 5;
    })
    .filter((product) => {
      if (formatFilter === 'all') return true;
      const activeVariants = (product.variants || []).filter((variant) => variant.isActive !== false);
      return activeVariants.some((variant) => variant.label === formatFilter);
    });
  const pagination = productsData?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.page || page;
  const startPage = Math.max(1, currentPage - 1);
  const endPage = Math.min(totalPages, startPage + 2);
  const visiblePages = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  );

  const formatOptions = Array.from(
    new Set(
      fetchedProducts.flatMap((product) =>
        (product.variants || [])
          .filter((variant) => variant.isActive !== false)
          .map((variant) => variant.label)
      )
    )
  ).slice(0, 6);

  const activeFiltersCount = [
    Boolean(activeCategory),
    showInStockOnly,
    priceRange !== 'all',
    weightRange !== 'all',
    formatFilter !== 'all',
    sortBy !== 'newest',
    Boolean(search.trim()),
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch('');
    setActiveCategory('');
    setSortBy('newest');
    setShowInStockOnly(false);
    setPriceRange('all');
    setWeightRange('all');
    setFormatFilter('all');
  };

  const chipBaseClass =
    'rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all';

  return (
    <div className="min-h-screen bg-agri-cream">
      <Navbar />
      <CartQuickDrawer
        open={drawerState.open}
        onClose={() => setDrawerState({ open: false })}
        title="Ajouté au panier"
        description="Le produit a bien été ajouté. Vous pouvez passer au checkout quand vous êtes prêt."
        productName={drawerState.productName}
        variantLabel={drawerState.variantLabel}
        quantity={drawerState.quantity}
      />

      {/* Page header */}
      <div className="bg-agri-green-700 pt-24 pb-12">
        <div className="container-agri">
          <h1 className="font-display text-4xl md:text-5xl text-white mb-3">Notre Boutique</h1>
          <p className="text-white/70">Produits locaux haïtiens de qualité, livrés chez vous</p>
        </div>
      </div>

      <div className="container-agri py-10">
        {/* Filters bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              id="search-products"
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Sort */}
          <select
            id="sort-products"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input w-full md:w-auto md:min-w-[200px]"
          >
            <option value="newest">Plus récents</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="popular">Populaires</option>
          </select>
        </div>

        <div className="md:hidden mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileFilters((current) => !current)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                showMobileFilters
                  ? 'border-agri-green-600 bg-agri-green-600 text-white shadow-agri'
                  : 'border-gray-200 bg-white text-agri-dark'
              }`}
            >
              <span className="flex items-center justify-between">
                <span>Filtres et catégories</span>
                <span className={`inline-flex items-center gap-2 ${showMobileFilters ? 'text-white' : 'text-gray-500'}`}>
                  {activeFiltersCount > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      showMobileFilters ? 'bg-white/20 text-white' : 'bg-agri-green-50 text-agri-green-700'
                    }`}>
                      {activeFiltersCount}
                    </span>
                  )}
                  <span>{showMobileFilters ? '−' : '+'}</span>
                </span>
              </span>
            </button>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-500"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {showMobileFilters && (
            <div className="mt-4 rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm space-y-5">
              <button
                type="button"
                onClick={() => setShowInStockOnly((current) => !current)}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                  showInStockOnly
                    ? 'bg-agri-green-600 text-white shadow-agri'
                    : 'bg-agri-cream text-gray-700 border border-gray-200'
                }`}
              >
                {showInStockOnly ? '✓ En stock uniquement' : 'En stock uniquement'}
              </button>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Budget</div>
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[
                    { value: 'all', label: 'Tous' },
                    { value: 'under-500', label: 'Moins de 500 HTG' },
                    { value: '500-1000', label: '500 à 1000 HTG' },
                    { value: '1000-plus', label: 'Plus de 1000 HTG' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriceRange(option.value as typeof priceRange)}
                      className={`${chipBaseClass} shrink-0 ${
                        priceRange === option.value
                          ? 'border-agri-gold-300 bg-agri-gold-300/90 text-agri-dark shadow-agri'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Poids</div>
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[
                    { value: 'all', label: 'Tous' },
                    { value: 'under-2', label: 'Moins de 2 Lbs' },
                    { value: '2-5', label: '2 à 5 Lbs' },
                    { value: '5-plus', label: 'Plus de 5 Lbs' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setWeightRange(option.value as typeof weightRange)}
                      className={`${chipBaseClass} shrink-0 ${
                        weightRange === option.value
                          ? 'border-agri-green-600 bg-agri-green-600 text-white shadow-agri'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {formatOptions.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Format</div>
                  <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      type="button"
                      onClick={() => setFormatFilter('all')}
                      className={`${chipBaseClass} shrink-0 ${
                        formatFilter === 'all'
                          ? 'border-agri-gold-300 bg-agri-gold-300/90 text-agri-dark shadow-agri'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      Tous
                    </button>
                    {formatOptions.map((format) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => setFormatFilter(format)}
                        className={`${chipBaseClass} shrink-0 ${
                          formatFilter === format
                            ? 'border-agri-gold-300 bg-agri-gold-300/90 text-agri-dark shadow-agri'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Catégories</div>
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    onClick={() => setActiveCategory('')}
                    className={`${chipBaseClass} shrink-0 ${
                      activeCategory === ''
                        ? 'border-agri-green-600 bg-agri-green-600 text-white shadow-agri'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    Tous
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`${chipBaseClass} shrink-0 ${
                        activeCategory === cat.id
                          ? 'border-agri-green-600 bg-agri-green-600 text-white shadow-agri'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <button
              type="button"
              onClick={() => setShowInStockOnly((current) => !current)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                showInStockOnly
                  ? 'bg-agri-green-600 text-white shadow-agri'
                  : 'bg-white text-gray-600 hover:bg-agri-green-50 hover:text-agri-green-600 border border-gray-200'
              }`}
            >
              {showInStockOnly ? '✓ En stock uniquement' : 'En stock uniquement'}
            </button>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-500 hover:text-agri-green-600 border border-gray-200"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="text-sm font-medium text-gray-500">Budget :</span>
            {[
              { value: 'all', label: 'Tous' },
              { value: 'under-500', label: 'Moins de 500 HTG' },
              { value: '500-1000', label: '500 à 1000 HTG' },
              { value: '1000-plus', label: 'Plus de 1000 HTG' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPriceRange(option.value as typeof priceRange)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  priceRange === option.value
                    ? 'bg-agri-gold-300/90 text-agri-dark shadow-agri'
                    : 'bg-white text-gray-600 hover:bg-agri-gold-50 hover:text-agri-gold-700 border border-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="text-sm font-medium text-gray-500">Poids :</span>
            {[
              { value: 'all', label: 'Tous' },
              { value: 'under-2', label: 'Moins de 2 Lbs' },
              { value: '2-5', label: '2 à 5 Lbs' },
              { value: '5-plus', label: 'Plus de 5 Lbs' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setWeightRange(option.value as typeof weightRange)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  weightRange === option.value
                    ? 'bg-agri-green-600 text-white shadow-agri'
                    : 'bg-white text-gray-600 hover:bg-agri-green-50 hover:text-agri-green-600 border border-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {formatOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <span className="text-sm font-medium text-gray-500">Format :</span>
              <button
                type="button"
                onClick={() => setFormatFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  formatFilter === 'all'
                    ? 'bg-agri-gold-300/90 text-agri-dark shadow-agri'
                    : 'bg-white text-gray-600 hover:bg-agri-gold-50 hover:text-agri-gold-700 border border-gray-200'
                }`}
              >
                Tous
              </button>
              {formatOptions.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setFormatFilter(format)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    formatFilter === format
                      ? 'bg-agri-gold-300/90 text-agri-dark shadow-agri'
                      : 'bg-white text-gray-600 hover:bg-agri-gold-50 hover:text-agri-gold-700 border border-gray-200'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap mb-8">
            <button
              onClick={() => setActiveCategory('')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === ''
                  ? 'bg-agri-green-600 text-white shadow-agri'
                  : 'bg-white text-gray-600 hover:bg-agri-green-50 hover:text-agri-green-600 border border-gray-200'
              }`}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-agri-green-600 text-white shadow-agri'
                    : 'bg-white text-gray-600 hover:bg-agri-green-50 hover:text-agri-green-600 border border-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-6">
          {isLoading ? 'Chargement...' : `${products.length} produit(s) affiché(s)${productsData?.pagination ? ` sur ${productsData.pagination.total}` : ''}`}
        </p>

        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {products.map((product) => {
            const activeVariants = (product.variants || []).filter((variant) => variant.isActive !== false);
            const {
              defaultVariant,
              defaultPrice,
              lowestPrice,
              hasTieredPricing,
              hasMultipleFormats,
              hasPriceDifference,
            } = getCardPricing(product);

            const handleAddToCart = () => {
              const availableStock = defaultVariant?.stockQuantity ?? product.stockQuantity;

              if (availableStock < 1) {
                toast.error('Ce produit est actuellement en rupture de stock.');
                return;
              }

              addItem({
                productId: product.id,
                productSlug: product.slug,
                productName: product.name,
                imageUrl: product.images?.[0]?.url,
                variantId: defaultVariant?.id,
                variantLabel: defaultVariant?.label,
                unitPrice: Number(defaultVariant?.price ?? product.price),
                baseUnitPrice: Number(defaultVariant?.price ?? product.price),
                vpPoints: Number(defaultVariant?.vpPoints ?? product.vpPoints),
                weightLbs: Number(defaultVariant?.weightLbs ?? product.weightLbs),
                quantity: 1,
                maxStock: availableStock,
                pricingTiers: defaultVariant?.pricingTiers || [],
              });

              setDrawerState({
                open: true,
                productName: product.name,
                variantLabel: defaultVariant?.label,
                quantity: 1,
              });
            };

            return (
              <div key={product.id} className="card-hover group overflow-hidden">
              <Link href={`/shop/${product.slug}`}>
                <div className="h-40 sm:h-48 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.14),_transparent_36%),linear-gradient(135deg,_#f9fbf4_0%,_#eef6e8_100%)] flex items-center justify-center text-6xl cursor-pointer overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <div className="w-full h-full p-3 sm:p-5 flex items-center justify-center">
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    '🌾'
                  )}
                </div>
                </Link>
                <div className="p-4">
                  <span className="text-xs text-gray-400 font-medium">{product.category?.name || 'Non catégorisé'}</span>
                  <Link href={`/shop/${product.slug}`}>
                    <h3 className="font-semibold text-agri-dark mt-1 mb-3 hover:text-agri-green-600 transition-colors cursor-pointer line-clamp-1">
                    {product.name}
                  </h3>
                </Link>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xl font-bold text-agri-green-700">
                    {defaultPrice.toLocaleString('fr-HT')} HTG
                  </span>
                  <span className="text-xs text-agri-gold-600 font-semibold bg-agri-gold-300/20 px-2 py-0.5 rounded-full">
                    {Number(product.vpPoints).toString()} PSK
                  </span>
                </div>
                {hasPriceDifference ? (
                  <p className="text-xs text-gray-500 mb-3">
                    {hasTieredPricing
                      ? `Prix du format affiché. Prix dégressif possible dès ${lowestPrice.toLocaleString('fr-HT')} HTG sur la fiche produit.`
                      : hasMultipleFormats
                        ? `Prix du format affiché. D’autres formats commencent à ${lowestPrice.toLocaleString('fr-HT')} HTG.`
                        : `Prix du format affiché. Détails sur la fiche produit.`}
                  </p>
                ) : hasTieredPricing ? (
                  <p className="text-xs text-gray-500 mb-3">Prix du format affiché. Prix dégressif détaillé sur la fiche produit.</p>
                ) : null}
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className={`font-semibold ${
                    (defaultVariant?.stockQuantity ?? product.stockQuantity) > 0 ? 'text-agri-green-700' : 'text-red-500'
                  }`}>
                    {(defaultVariant?.stockQuantity ?? product.stockQuantity) > 0 ? 'En stock' : 'Rupture'}
                  </span>
                  <span className="text-gray-400">Livraison AGRIKIRI</span>
                </div>
                {activeVariants.length > 1 && (
                  <p className="text-xs text-gray-400 mb-3">
                    {activeVariants.length} formats disponibles
                  </p>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={(defaultVariant?.stockQuantity ?? product.stockQuantity) < 1}
                >
                  🛒 Ajouter au panier
                </Button>
              </div>
              </div>
            );
          })}
        </div>

        {!isLoading && products.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="font-display text-2xl text-agri-dark mb-2">Aucun produit trouvé</h3>
            <p className="text-gray-500">Essayez avec d&apos;autres mots-clés ou catégories</p>
          </div>
        )}

        {!isLoading && pagination && pagination.totalPages > 1 && (
          <div className="mt-2 mb-6 flex flex-col items-center gap-4">
            <p className="text-sm text-gray-500">
              Page {currentPage} sur {pagination.totalPages}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination.hasPrev}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-agri-green-200 hover:text-agri-green-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                ← Précédent
              </button>

              {startPage > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    className="h-11 min-w-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 transition hover:border-agri-green-200 hover:text-agri-green-700"
                  >
                    1
                  </button>
                  {startPage > 2 && <span className="px-1 text-gray-400">…</span>}
                </>
              )}

              {visiblePages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`h-11 min-w-11 rounded-xl border px-3 text-sm font-semibold transition ${
                    currentPage === pageNumber
                      ? 'border-agri-green-600 bg-agri-green-600 text-white shadow-agri'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-agri-green-200 hover:text-agri-green-700'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}

              {endPage < totalPages && (
                <>
                  {endPage < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className="h-11 min-w-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 transition hover:border-agri-green-200 hover:text-agri-green-700"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={!pagination.hasNext}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-agri-green-200 hover:text-agri-green-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
