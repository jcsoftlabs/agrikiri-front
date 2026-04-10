'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getProducts, getCategories } from '@/lib/services/products';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState(''); // empty for 'Tous'
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const addItem = useCartStore((state) => state.addItem);
  const PAGE_SIZE = 12;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get('search') || '');
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, activeCategory, sortBy]);

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

  const products = productsData?.products || [];
  const pagination = productsData?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.page || page;
  const startPage = Math.max(1, currentPage - 1);
  const endPage = Math.min(totalPages, startPage + 2);
  const visiblePages = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  );

  return (
    <div className="min-h-screen bg-agri-cream">
      <Navbar />

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
            className="input w-auto min-w-[200px]"
          >
            <option value="newest">Plus récents</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="popular">Populaires</option>
          </select>
        </div>

        {/* Categories */}
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

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-6">
          {isLoading ? 'Chargement...' : `${products.length} produit(s) trouvé(s)${productsData?.pagination ? ` sur ${productsData.pagination.total}` : ''}`}
        </p>

        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {products.map((product) => {
            const activeVariants = (product.variants || []).filter((variant) => variant.isActive !== false);
            const prices = activeVariants.map((variant) => Number(variant.price));
            const minPrice = prices.length > 0 ? Math.min(...prices) : Number(product.price);
            const defaultVariant = activeVariants.find((variant) => variant.isDefault) ?? activeVariants[0];

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
                vpPoints: Number(defaultVariant?.vpPoints ?? product.vpPoints),
                weightLbs: Number(defaultVariant?.weightLbs ?? product.weightLbs),
                quantity: 1,
                maxStock: availableStock,
              });

              toast.success(
                defaultVariant?.label
                  ? `${product.name} (${defaultVariant.label}) ajouté au panier`
                  : `${product.name} ajouté au panier`
              );
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
                    {minPrice.toLocaleString()} HTG
                  </span>
                  <span className="text-xs text-agri-gold-600 font-semibold bg-agri-gold-300/20 px-2 py-0.5 rounded-full">
                    {Number(product.vpPoints).toString()} PSK
                  </span>
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
