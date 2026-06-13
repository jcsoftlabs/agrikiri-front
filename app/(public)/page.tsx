import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSearch from '@/components/ui/HeroSearch';
import Link from 'next/link';
import type { Category, Product } from '@/lib/services/products';

export const metadata: Metadata = {
  title: 'AGRIKIRI — De nos champs haïtiens à votre table',
  description:
    "Achetez des produits locaux haïtiens avec une boutique claire, une livraison locale simple et une expérience d'achat fluide.",
};

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */

const STATS = [
  { value: '100%', label: 'Produits locaux', icon: '🌿' },
  { value: 'Local', label: 'Livraison en Haïti', icon: '📦' },
  { value: 'Multi', label: 'Formats disponibles', icon: '⚖️' },
  { value: 'Simple', label: 'Paiement fluide', icon: '✅' },
];

const TRUST_POINTS = [
  {
    icon: '✅',
    title: 'Produits réels',
    color: '#2D7A2D',
    bg: '#f0f9f0',
  },
  {
    icon: '📍',
    title: 'Origine locale',
    color: '#B8690A',
    bg: '#fff8ed',
  },
  {
    icon: '🧾',
    title: 'Infos transparentes',
    color: '#6B4AB8',
    bg: '#f5f0ff',
  },
  {
    icon: '🤲',
    title: 'Réseau facultatif',
    color: '#C0534B',
    bg: '#fff0ef',
  },
];

/* ─────────────────────────────────────────
   DATA FETCHING
───────────────────────────────────────── */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://agrikiri-backend-production.up.railway.app/api'
    : 'http://localhost:3001/api');

async function getHomeData(): Promise<{ categories: Category[]; products: Product[] }> {
  try {
    const [categoriesRes, productsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/products/categories`, { next: { revalidate: 60 } }),
      fetch(`${API_BASE_URL}/products?limit=8&sortBy=createdAt&sortOrder=desc`, { next: { revalidate: 60 } }),
    ]);
    const categoriesPayload = categoriesRes.ok ? await categoriesRes.json() : { data: [] };
    const productsPayload   = productsRes.ok   ? await productsRes.json()   : { data: { products: [] } };
    return {
      categories: categoriesPayload?.data ?? [],
      products:   productsPayload?.data?.products ?? [],
    };
  } catch {
    return { categories: [], products: [] };
  }
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */

export default async function HomePage() {
  const { categories, products } = await getHomeData();

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F0' }}>
      <Navbar />

      {/* ══════════════════════════════════════════════
          ① HERO — LUMINEUX, agricole
         ══════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f0f9eb 0%, #e8f5e0 35%, #fdf6e3 70%, #fef9ec 100%)',
        }}
      >

        {/* Organic blob shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(134,197,79,0.35) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -top-16 right-0 w-[500px] h-[400px] rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-[700px] h-[500px] rounded-full opacity-35"
            style={{ background: 'radial-gradient(circle, rgba(74,163,41,0.2) 0%, transparent 70%)' }}
          />
        </div>

        <div className="container-agri relative z-10 pt-24 pb-16">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center">

            {/* Left */}
            <div>
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-7"
                style={{
                  background: 'rgba(26,92,26,0.08)', border: '1.5px solid rgba(26,92,26,0.15)',
                  color: '#1a5c1a', fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4CAF50' }} />
                🇭🇹 Produits 100% haïtiens — Cultivés localement
              </div>

              {/* Headline */}
              <h1
                className="mb-6"
                style={{
                  fontFamily: "'Playfair Display', serif", fontWeight: 900,
                  fontSize: 'clamp(2.8rem, 6vw, 5.5rem)', lineHeight: 1.05,
                  letterSpacing: '-0.02em', color: '#1a2e1a',
                }}
              >
                De nos champs
                <span className="block" style={{ color: '#2d7a2d' }}>haïtiens</span>
                <span className="block" style={{ color: '#1a2e1a', fontSize: '85%', fontWeight: 700 }}>à votre table</span>
              </h1>

              <p
                className="text-base md:text-lg mb-8 max-w-xl"
                style={{ color: '#4a5a4a', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.75 }}
              >
                Découvrez des produits locaux haïtiens faciles à parcourir, à comparer et à commander,
                avec une livraison locale claire, des formats adaptés et un parcours d’achat sans friction.
              </p>

              <div className="mb-7"><HeroSearch /></div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link href="/shop">
                  <button
                    className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-[1.03] active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #2d7a2d, #1a5c1a)', color: '#FFFFFF',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 4px 20px rgba(45,122,45,0.35)',
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    Voir la boutique
                  </button>
                </Link>
                <Link href="#categories">
                  <button
                    className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-[1.03] active:scale-95"
                    style={{
                      background: 'transparent', color: '#1a5c1a',
                      border: '2px solid rgba(26,92,26,0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    Découvrir les catégories
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.03]"
                    style={{
                      background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(26,92,26,0.12)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="text-base mb-1">{stat.icon}</div>
                    <div className="font-bold text-xl leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#1a5c1a', letterSpacing: '-0.02em' }}>
                      {stat.value}
                    </div>
                    <div className="text-[11px] md:text-xs mt-1 leading-tight" style={{ color: '#78906e', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Visual card ── */}
            <div className="hidden lg:block">
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(26,92,26,0.15)',
                  boxShadow: '0 24px 72px rgba(45,122,45,0.15), 0 8px 24px rgba(0,0,0,0.08)',
                }}
              >
                <div
                  className="relative flex items-center justify-center"
                  style={{ height: '280px', background: 'linear-gradient(160deg, #c8e6a0 0%, #a5d46a 40%, #7ab648 70%, #5a9c30 100%)' }}
                >
                  <div className="text-center">
                    <div style={{ fontSize: '4.5rem', lineHeight: 1 }}>🌿🌾🥬</div>
                    <div className="mt-3 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Produits haïtiens — formats pensés pour le quotidien</div>
                  </div>
                  <div
                    className="absolute top-4 left-4 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.92)', color: '#1a5c1a', fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    ✓ Achat simple et livraison locale
                  </div>
                </div>
                <div className="p-5 grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl" style={{ background: '#f0f9eb', border: '1px solid rgba(26,92,26,0.1)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#2d7a2d', fontFamily: "'Space Grotesk', sans-serif" }}>Catalogue</div>
                    <div className="text-sm font-semibold" style={{ color: '#1a2e1a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Formats, prix et disponibilité clairs</div>
                  </div>
                  <div className="p-4 rounded-2xl" style={{ background: '#fef9ec', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#b8690a', fontFamily: "'Space Grotesk', sans-serif" }}>Livraison</div>
                    <div className="text-sm font-semibold" style={{ color: '#1a2e1a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Locale, plus claire et plus prévisible</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ color: 'rgba(248,244,238,0.3)' }}>
          <span className="text-[11px] tracking-widest uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Défiler</span>
          <div className="w-5 h-8 rounded-full flex items-start justify-center p-1.5" style={{ border: '1.5px solid rgba(255,255,255,0.2)' }}>
            <div className="w-1 h-2 rounded-full animate-bounce" style={{ background: '#F59E0B' }} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ① bis MOBILE QUICK PRODUCTS
         ══════════════════════════════════════════════ */}
      {products.length > 0 && (
        <section className="py-8 md:py-10" style={{ background: '#FFFFFF', borderTop: '1px solid #eef2e7' }}>
          <div className="container-agri">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-agri-green-600">À acheter maintenant</div>
                <h2 className="font-display text-2xl md:text-3xl text-agri-dark mt-1">Nos produits</h2>
              </div>
              <Link href="/shop" className="text-sm font-semibold text-agri-green-700">
                Voir tout →
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
              {products.slice(0, 4).map((p) => {
                const activeVariants = (p.variants || []).filter((v) => v.isActive !== false);
                const primaryVariant = activeVariants.find((v) => v.isDefault) ?? activeVariants[0];
                const price = Number(primaryVariant?.price ?? p.price);
                const img = p.images?.[0]?.url;

                return (
                  <Link key={p.id} href={`/shop/${p.slug}`}>
                    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-card transition-shadow">
                      <div className="h-28 md:h-40 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_34%),linear-gradient(135deg,#f9fbf4_0%,#eef6e8_100%)] flex items-center justify-center">
                        {img ? (
                          <img src={img} alt={p.name} className="max-w-full max-h-full object-contain p-3" />
                        ) : (
                          <span className="text-5xl">🌾</span>
                        )}
                      </div>
                      <div className="p-3 md:p-4">
                        <h3 className="text-sm md:text-base font-semibold text-agri-dark line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                        <div className="mt-2 text-base font-bold text-agri-green-700" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {price.toLocaleString('fr-HT')} HTG
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          ② TRUST STRIP — Blanc, icônes colorées
         ══════════════════════════════════════════════ */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid #e8f0e0', borderBottom: '1px solid #e8f0e0' }}>
        <div className="container-agri py-6 md:py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST_POINTS.map((point) => (
              <div
                key={point.title}
                className="flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.02]"
                style={{ background: point.bg, border: `1px solid ${point.color}20` }}
              >
                <span className="text-2xl">{point.icon}</span>
                <div>
                  <div className="font-semibold text-sm mb-0.5" style={{ color: '#1a2e1a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{point.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ④ CATÉGORIES — Blanc lumineux
         ══════════════════════════════════════════════ */}
      <section id="categories" className="py-16 md:py-20" style={{ background: '#FFFFFF', borderTop: '1px solid #f0f0ea' }}>
        <div className="container-agri">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-agri-green-600 font-semibold text-sm uppercase tracking-wider">Notre offre</span>
              <h2 className="font-display text-3xl md:text-4xl text-agri-dark mt-2">Nos Catégories</h2>
              <p className="text-gray-500 mt-2 max-w-lg">Parcourez rapidement les grandes familles de produits.</p>
            </div>
            <Link href="/shop" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-agri-green-700 hover:text-agri-green-600 transition-colors">
              Voir tout →
            </Link>
          </div>

          {/* Polaroid grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {categories.length > 0
              ? categories.slice(0, 4).map((cat, index) => {
                  const rotations = ['-1deg', '0.8deg', '-0.5deg', '1.2deg'];
                  return (
                    <Link key={cat.id} href={`/shop?category=${cat.id}`}>
                      <div
                        className="polaroid-card group cursor-pointer"
                        style={{ transform: `rotate(${rotations[index]})` }}
                      >
                        <div className="relative h-44 sm:h-52 overflow-hidden">
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl bg-agri-green-50">🌾</div>
                          )}
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(6,10,20,0.82) 0%, transparent 50%)' }} />
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.92)', color: '#060a14', fontFamily: "'Space Grotesk', sans-serif" }}>
                            {typeof cat._count?.products === 'number' ? `${cat._count.products} produit(s)` : 'Voir'}
                          </div>
                        </div>
                        <div className="p-4" style={{ background: '#1a2e1a' }}>
                          <h3 className="font-bold text-base text-white font-display">{cat.name}</h3>
                          <p className="text-xs mt-1 text-white/50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Parcourir →</p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              : <div className="col-span-4 text-center py-12 text-sm text-gray-400">Aucune catégorie disponible pour le moment.</div>
            }
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ⑤ BESTSELLERS — Crème chaud (produits appétissants)
         ══════════════════════════════════════════════ */}
      <section className="py-10 md:py-14" style={{ background: '#F9F6F0' }}>
        <div className="container-agri">
          <div className="text-center mb-8 md:mb-12">
            <span className="text-agri-green-600 font-semibold text-sm uppercase tracking-wider">Nos favoris</span>
            <h2 className="font-display text-4xl md:text-5xl text-agri-dark mt-2">Bestsellers</h2>
          </div>

          {products.length > 0 ? (
            <>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)] items-stretch mb-6">
                {/* Featured */}
                {products[0] && (() => {
                  const p = products[0];
                  const activeVariants = (p.variants || []).filter((v) => v.isActive !== false);
                  const primaryVariant = activeVariants.find((v) => v.isDefault) ?? activeVariants[0];
                  const price = Number(primaryVariant?.price ?? p.price);
                  const vp    = Number(primaryVariant?.vpPoints ?? p.vpPoints);
                  const img   = p.images?.[0]?.url;
                  return (
                    <Link href={`/shop/${p.slug}`} className="block">
                      <div className="card-hover group cursor-pointer overflow-hidden h-full">
                        <div className="grid h-full lg:grid-cols-[minmax(0,0.9fr)_minmax(280px,1.1fr)]">
                          <div className="flex flex-col justify-end p-6 lg:p-8 bg-[linear-gradient(160deg,#234425_0%,#142818_100%)]">
                            <div className="text-agri-gold-300 text-xs font-bold uppercase tracking-widest mb-3">⭐ Bestseller #1</div>
                            <h3 className="font-display text-2xl lg:text-3xl text-white mb-4 leading-tight">{p.name}</h3>
                            <p className="hidden md:block text-sm text-white/70 mb-5 max-w-sm">
                              Un choix sûr pour découvrir AGRIKIRI rapidement, avec un format simple à commander et une lecture claire du prix.
                            </p>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-2xl lg:text-3xl font-bold text-agri-gold-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {price.toLocaleString('fr-HT')} HTG
                              </span>
                              <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full text-agri-gold-500 bg-agri-gold-300/15 border border-agri-gold-400/25">
                                {vp} PSK
                              </span>
                            </div>
                            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white">
                              Voir le produit
                              <span aria-hidden="true">→</span>
                            </div>
                          </div>

                          <div className="relative min-h-[280px] lg:min-h-[380px] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_30%),linear-gradient(135deg,#f8fbf4_0%,#edf5e7_100%)] overflow-hidden">
                            {img ? (
                              <div className="absolute inset-0 p-6 lg:p-8 flex items-center justify-center">
                                <img
                                  src={img}
                                  alt={p.name}
                                  className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                />
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-8xl">🌾</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })()}

                {/* Side 2×2 */}
                <div className="grid grid-cols-2 gap-4 auto-rows-fr">
                  {products.slice(1, 5).map((p, idx) => {
                    const badges = ['Nouveau', 'Populaire', 'À découvrir', 'Tendance'];
                    const activeVariants = (p.variants || []).filter((v) => v.isActive !== false);
                    const primaryVariant = activeVariants.find((v) => v.isDefault) ?? activeVariants[0];
                    const price = Number(primaryVariant?.price ?? p.price);
                    const img   = p.images?.[0]?.url;
                    return (
                      <Link key={p.id} href={`/shop/${p.slug}`}>
                        <div className="card-hover group cursor-pointer h-full overflow-hidden border border-white/70">
                          <div className="h-40 sm:h-44 relative overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_34%),linear-gradient(135deg,#f9fbf4_0%,#eef6e8_100%)]">
                            {img ? (
                              <div className="w-full h-full p-4 flex items-center justify-center">
                                <img
                                  src={img}
                                  alt={p.name}
                                  className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                />
                              </div>
                            ) : <span className="text-4xl">🌾</span>}
                          </div>
                          <div className="p-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-agri-green-600">{badges[idx % badges.length]}</span>
                            <h3 className="font-semibold text-agri-dark text-sm sm:text-base mt-2 mb-2 leading-tight line-clamp-2">{p.name}</h3>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-bold text-agri-green-700" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {price.toLocaleString('fr-HT')} HTG
                              </span>
                              <span className="text-xs font-semibold text-gray-400">Voir →</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Additional products */}
              {products.length > 5 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
                  {products.slice(5, 9).map((p, idx) => {
                    const badges = ['Coup de cœur', 'En stock', 'Recommandé', 'Essentiel'];
                    const activeVariants = (p.variants || []).filter((v) => v.isActive !== false);
                    const primaryVariant = activeVariants.find((v) => v.isDefault) ?? activeVariants[0];
                    const price = Number(primaryVariant?.price ?? p.price);
                    const img   = p.images?.[0]?.url;
                    return (
                      <Link key={p.id} href={`/shop/${p.slug}`}>
                        <div className="card-hover group cursor-pointer overflow-hidden border border-white/70">
                          <div className="h-36 relative overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_36%),linear-gradient(135deg,#f9fbf4_0%,#eef6e8_100%)]">
                            {img ? (
                              <img src={img} alt={p.name} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105 p-3" />
                            ) : <span className="text-5xl">🌾</span>}
                          </div>
                          <div className="p-4">
                            <span className="text-xs font-semibold text-agri-green-600 bg-agri-green-50 px-2 py-0.5 rounded-full">{badges[idx % badges.length]}</span>
                            <h3 className="font-semibold text-agri-dark mt-2 mb-1 text-sm">{p.name}</h3>
                            <span className="font-bold text-agri-green-700" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                              {price.toLocaleString('fr-HT')} HTG
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-sm text-gray-400">Aucun produit disponible pour le moment.</div>
          )}

          <div className="text-center mt-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/shop"><button className="btn-secondary">Voir tous les produits →</button></Link>
              {products[0] && (
                <Link href={`/shop/${products[0].slug}`}>
                  <button className="inline-flex items-center gap-2 rounded-xl border border-agri-green-200 bg-white px-5 py-3 text-sm font-semibold text-agri-green-700 transition-colors hover:bg-agri-green-50">
                    Acheter le bestseller
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ⑥ AYIZAN — Compacte et secondaire
         ══════════════════════════════════════════════ */}
      <section
        id="ayizan"
        className="relative overflow-hidden py-8 md:py-10"
        style={{ background: '#f5f9f0' }}
      >
        {/* Blob décoratif */}
        <div className="absolute right-0 top-0 w-1/2 h-full pointer-events-none" style={{ background: 'radial-gradient(ellipse at right top, rgba(180,230,140,0.25) 0%, transparent 65%)' }} />
        <div className="absolute left-0 bottom-0 w-1/3 h-full pointer-events-none" style={{ background: 'radial-gradient(ellipse at left bottom, rgba(245,158,11,0.08) 0%, transparent 65%)' }} />

        <div className="container-agri relative z-10">
          <div
            className="rounded-3xl p-5 md:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(26,92,26,0.12)', boxShadow: '0 8px 24px rgba(45,122,45,0.08)' }}
          >
            <div className="max-w-2xl">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
                style={{ background: 'rgba(26,92,26,0.08)', color: '#1a5c1a', border: '1.5px solid rgba(26,92,26,0.15)', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                🌱 Opportunité complémentaire
              </div>
              <h2
                className="mb-3"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 'clamp(1.5rem, 3vw, 2.3rem)', color: '#1a2e1a', lineHeight: 1.15 }}
              >
                Acheter d’abord. Rejoindre AYIZAN ensuite si vous le souhaitez.
              </h2>
              <p className="text-sm md:text-base leading-relaxed" style={{ color: '#4a5a4a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                La boutique reste prioritaire. Le réseau AYIZAN vient en complément pour les clients qui veulent ensuite vendre et parrainer autour de produits réels.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Éligible dès 9 000 HTG d’achats payés', 'Aucune obligation', 'Dashboard et commissions ensuite'].map((item) => (
                  <span
                    key={item}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{ background: '#f0f9eb', color: '#2d7a2d', border: '1px solid rgba(45,122,45,0.15)' }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="lg:min-w-[260px]">
              <Link href="/register">
                <button
                  className="w-full py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #2d7a2d, #1a5c1a)', color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 4px 16px rgba(45,122,45,0.3)' }}
                >
                  🌱 En savoir plus sur AYIZAN
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
