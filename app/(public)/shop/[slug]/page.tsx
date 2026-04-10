'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { getProductBySlug } from '@/lib/services/products';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

const USD_RATE = 132;

export default function ProductPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const addItem = useCartStore((state) => state.addItem);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', params.slug],
    queryFn: () => getProductBySlug(params.slug),
  });

  useEffect(() => {
    if (!product) return;

    const activeVariants = (product.variants || []).filter((variant) => variant.isActive !== false);
    const defaultVariant = activeVariants.find((variant) => variant.isDefault) ?? activeVariants[0];
    setSelectedVariantId(defaultVariant?.id || '');
    setQuantity(1);
  }, [product]);

  useEffect(() => {
    if (!product) return;

    const variants = (product.variants || []).filter((variant) => variant.isActive !== false);
    const currentVariant =
      variants.find((variant) => variant.id === selectedVariantId) ??
      variants.find((variant) => variant.isDefault) ??
      variants[0];

    const stock = currentVariant?.stockQuantity ?? product.stockQuantity;
    setQuantity((current) => Math.min(Math.max(1, current), Math.max(1, stock)));
  }, [product, selectedVariantId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-agri-cream flex flex-col">
        <Navbar />
        <div className="container-agri py-28 flex-1 flex justify-center items-center">
          <div className="text-xl">Chargement...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-agri-cream flex flex-col">
        <Navbar />
        <div className="container-agri py-28 flex-1 flex justify-center items-center">
          <div className="text-xl text-red-500">Produit introuvable.</div>
        </div>
        <Footer />
      </div>
    );
  }

  const images = product.images?.length ? product.images.map((img) => img.url) : [];
  const activeVariants = (product.variants || []).filter((variant) => variant.isActive !== false);
  const selectedVariant =
    activeVariants.find((variant) => variant.id === selectedVariantId) ??
    activeVariants.find((variant) => variant.isDefault) ??
    activeVariants[0];

  const displayedPrice = Number(selectedVariant?.price ?? product.price);
  const displayedVP = Number(selectedVariant?.vpPoints ?? product.vpPoints);
  const displayedWeight = Number(selectedVariant?.weightLbs ?? product.weightLbs);
  const availableStock = selectedVariant?.stockQuantity ?? product.stockQuantity;
  const maxQuantity = Math.max(1, availableStock);
  const isOutOfStock = availableStock < 1;
  const totalPrice = displayedPrice * quantity;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error('Cette variante est actuellement en rupture de stock.');
      return;
    }

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      imageUrl: product.images?.[0]?.url,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      unitPrice: displayedPrice,
      vpPoints: displayedVP,
      weightLbs: displayedWeight,
      quantity,
      maxStock: availableStock,
    });

    toast.success(
      selectedVariant?.label
        ? `${quantity} x ${product.name} (${selectedVariant.label}) ajouté(s) au panier`
        : `${quantity} x ${product.name} ajouté(s) au panier`
    );
  };

  const handleBuyNow = () => {
    handleAddToCart();
    if (!isOutOfStock) {
      router.push('/cart');
    }
  };

  return (
    <div className="min-h-screen bg-agri-cream">
      <Navbar />

      <div className="bg-gradient-to-b from-agri-green-50 via-agri-cream to-agri-cream pt-24 pb-8 border-b border-agri-green-100">
        <div className="container-agri">
          <nav className="text-sm text-gray-400 mb-6">
            <span>Boutique</span>
            <span className="mx-2">/</span>
            <span>{product.category?.name || 'General'}</span>
            <span className="mx-2">/</span>
            <span className="text-agri-green-700 font-medium">{product.name}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <span className="badge bg-agri-green-50 text-agri-green-700 border border-agri-green-200">
                Certifie Local 🇭🇹
              </span>
              <span className="badge bg-white text-gray-500 border border-gray-200">
                {product.category?.name || 'General'}
              </span>
              {selectedVariant && (
                <span className="badge bg-agri-gold-300/25 text-agri-gold-700 border border-agri-gold-300/60">
                  {selectedVariant.label}
                </span>
              )}
            </div>

            <h1 className="font-display text-4xl md:text-5xl text-agri-dark mb-4">{product.name}</h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      <div className="container-agri py-10 md:py-14">
        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-8 xl:gap-12 items-start">
          <div className="space-y-4">
            <div className="card overflow-hidden border border-white/60 shadow-[0_24px_60px_rgba(35,62,35,0.08)]">
              <div className="relative aspect-[4/3] sm:aspect-[4/3] bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.16),_transparent_38%),linear-gradient(135deg,_#ffffff_0%,_#f6f8ef_100%)] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(45,122,45,0.04),transparent_45%,rgba(212,175,55,0.08))]" />
                {images.length > 0 ? (
                  <img
                    src={images[activeImage]}
                    alt={product.name}
                    className="relative z-10 h-full w-full object-contain p-4 sm:p-6 md:p-8"
                  />
                ) : (
                  <div className="relative z-10 text-8xl">🌾</div>
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`group rounded-2xl overflow-hidden border-2 bg-white transition-all ${
                      i === activeImage
                        ? 'border-agri-green-500 shadow-agri'
                        : 'border-gray-100 hover:border-agri-green-300'
                    }`}
                  >
                    <div className="aspect-square bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.12),_transparent_36%),linear-gradient(135deg,_#ffffff_0%,_#f6f8ef_100%)] overflow-hidden p-2">
                      <img
                        src={img}
                        alt={`${product.name} ${i + 1}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-gray-400 mb-2">Origine</div>
                <div className="font-semibold text-agri-dark">Produit local</div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-gray-400 mb-2">Livraison</div>
                <div className="font-semibold text-agri-dark">Disponible</div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-gray-400 mb-2">Conditionnement</div>
                <div className="font-semibold text-agri-dark">{displayedWeight} Lbs</div>
              </div>
            </div>
          </div>

          <div className="space-y-5 xl:sticky xl:top-28">
            <div className="card p-6 md:p-7 border border-white/70 shadow-[0_24px_60px_rgba(35,62,35,0.08)]">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="text-sm uppercase tracking-[0.22em] text-gray-400 mb-2">Prix</div>
                  <div className="flex items-end gap-3 flex-wrap">
                    <span className="text-4xl md:text-5xl font-bold text-agri-green-700">
                      {displayedPrice.toLocaleString()} HTG
                    </span>
                    <span className="text-xl text-gray-400 mb-1">
                      ≈ ${(displayedPrice / USD_RATE).toFixed(2)} USD
                    </span>
                  </div>
                </div>
                <div className="badge bg-agri-gold-300/30 text-agri-gold-700 border border-agri-gold-300 px-4 py-2 text-sm">
                  {displayedVP} PSK
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-2xl bg-agri-green-50 border border-agri-green-100 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-agri-green-700/60 mb-2">Stock</div>
                  <div className={`text-2xl font-bold ${isOutOfStock ? 'text-red-500' : 'text-agri-dark'}`}>
                    {availableStock}
                  </div>
                </div>
                <div className="rounded-2xl bg-white border border-gray-100 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-gray-400 mb-2">Total actuel</div>
                  <div className="text-2xl font-bold text-agri-dark">
                    {totalPrice.toLocaleString()} HTG
                  </div>
                </div>
              </div>

              {activeVariants.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-agri-dark mb-3">Choisissez un format</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {activeVariants.map((variant) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      return (
                        <button
                          key={variant.id || variant.label}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id || '')}
                          className={`rounded-2xl border-2 p-4 text-left transition-all ${
                            isSelected
                              ? 'border-agri-green-600 bg-agri-green-50 shadow-[0_12px_24px_rgba(45,122,45,0.08)]'
                              : 'border-gray-200 bg-white hover:border-agri-green-300'
                          }`}
                        >
                          <div className="font-semibold text-lg text-agri-dark">{variant.label}</div>
                          <div className="flex items-center justify-between mt-3 text-sm">
                            <span className="text-agri-green-700 font-semibold">
                              {Number(variant.price).toLocaleString()} HTG
                            </span>
                            <span className="text-gray-400">{Number(variant.weightLbs)} Lbs</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-gray-400 mt-3">
                    Poids approx.: {displayedWeight} Lbs
                  </p>
                </div>
              )}

              <div className="mb-7">
                <label className="block text-sm font-semibold text-agri-dark mb-3">Quantite</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden bg-white">
                    <button
                      id="qty-minus"
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-5 py-4 text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
                    >
                      −
                    </button>
                    <span className="px-7 py-4 font-bold text-agri-dark min-w-[72px] text-center text-lg">
                      {quantity}
                    </span>
                    <button
                      id="qty-plus"
                      type="button"
                      onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                      className="px-5 py-4 text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="text-gray-500">
                      Stock disponible : <strong className="text-agri-dark">{availableStock}</strong>
                    </div>
                    {isOutOfStock ? (
                      <div className="font-medium text-red-500">Rupture de stock</div>
                    ) : (
                      <div className="text-agri-green-700 font-medium">Disponible immédiatement</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Button
                  id="add-to-cart"
                  variant="secondary"
                  size="lg"
                  className="w-full !rounded-2xl"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  🛒 Ajouter au panier
                </Button>
                <Button
                  id="buy-now"
                  variant="primary"
                  size="lg"
                  className="w-full !rounded-2xl"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                >
                  ⚡ Acheter maintenant
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-semibold text-agri-dark mb-3">Description</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-gray-100">
                <div className="rounded-2xl bg-agri-cream p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-gray-400 mb-2">Format choisi</div>
                  <div className="font-semibold text-agri-dark">{selectedVariant?.label || 'Format standard'}</div>
                </div>
                <div className="rounded-2xl bg-agri-cream p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-gray-400 mb-2">Points commission</div>
                  <div className="font-semibold text-agri-dark">{displayedVP} PSK</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
