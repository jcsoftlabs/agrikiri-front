import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import type { Category, Product } from '@/lib/services/products';

export const metadata: Metadata = {
  title: 'AGRIKIRI — De nos champs haïtiens à votre table',
  description:
    'Plateforme e-commerce de produits locaux haïtiens avec réseau MLM. Achetez local, vendez et gagnez jusqu\'à 2,000,000 HTG/an.',
};

const STATS = [
  { value: 'Produits locaux', label: 'Sélectionnés avec soin' },
  { value: 'Qualité', label: 'Origine et traçabilité' },
  { value: 'Livraison', label: 'Selon disponibilité' },
  { value: 'Réseau', label: 'Opportunité AYIZAN' },
];

const MLM_LEVELS_PREVIEW = [
  { name: 'Ayizan', icon: '🌱', commission: '30,000', color: 'border-blue-200 bg-blue-50', textColor: 'text-blue-700' },
  { name: 'Guacanagaric', icon: '⭐', commission: '100,000', color: 'border-amber-200 bg-amber-50', textColor: 'text-amber-700' },
  { name: 'Mackandal', icon: '🔥', commission: '300,000', color: 'border-green-200 bg-green-50', textColor: 'text-green-700' },
  { name: 'Boukman', icon: '👑', commission: '650,000', color: 'border-red-200 bg-red-50', textColor: 'text-red-700' },
];

const REVENUE_SOURCES = [
  {
    icon: '💰',
    title: 'Commission Directe',
    description: 'Gagnez 10% sur chaque vente que vous réalisez directement.',
    example: 'Ex: 25 HTG/paquet de riz',
    color: 'bg-agri-green-50 border-agri-green-200',
  },
  {
    icon: '🌐',
    title: 'Commission Réseau',
    description: 'Gagnez 5% sur les ventes de vos recrues directes.',
    example: 'Réseau illimité en profondeur',
    color: 'bg-blue-50 border-blue-200',
  },
  {
    icon: '🏆',
    title: 'Bonus Mensuel',
    description: 'Atteignez 546 PSK/mois et recevez votre prime de niveau.',
    example: "Jusqu'à 2,000,000 HTG/an",
    color: 'bg-agri-gold-300/20 border-agri-gold-400',
  },
];

const SHOP_BENEFITS = [
  {
    icon: '🌿',
    title: 'Produits locaux fiables',
    description: 'Une sélection pensée pour la consommation quotidienne, avec une présentation claire et un achat simple.',
  },
  {
    icon: '📦',
    title: 'Formats adaptés',
    description: 'Choisissez la variante qui vous convient selon votre budget, votre usage et votre stock.',
  },
  {
    icon: '🤝',
    title: 'Réseau en option',
    description: 'Vous pouvez d’abord acheter comme client, puis rejoindre AYIZAN plus tard si vous le souhaitez.',
  },
];

const TRUST_POINTS = [
  { icon: '✅', title: 'Produits réels', text: 'Des articles réellement disponibles à la commande.' },
  { icon: '📍', title: 'Origine locale', text: 'Une mise en avant de produits locaux haïtiens.' },
  { icon: '🧾', title: 'Informations claires', text: 'Formats, prix et présentation lisibles avant achat.' },
  { icon: '🤲', title: 'Réseau facultatif', text: 'Le programme AYIZAN vient en complément, pas à la place de la boutique.' },
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://agrikiri-backend-production.up.railway.app/api'
    : 'http://localhost:3001/api');

async function getHomeData(): Promise<{
  categories: Category[];
  products: Product[];
}> {
  try {
    const [categoriesRes, productsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/products/categories`, {
        next: { revalidate: 60 },
      }),
      fetch(`${API_BASE_URL}/products?limit=8&sortBy=createdAt&sortOrder=desc`, {
        next: { revalidate: 60 },
      }),
    ]);

    const categoriesPayload = categoriesRes.ok ? await categoriesRes.json() : { data: [] };
    const productsPayload = productsRes.ok ? await productsRes.json() : { data: { products: [] } };

    return {
      categories: categoriesPayload?.data ?? [],
      products: productsPayload?.data?.products ?? [],
    };
  } catch {
    return {
      categories: [],
      products: [],
    };
  }
}

export default async function HomePage() {
  const { categories, products } = await getHomeData();
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden pt-20 pb-10 md:pt-24 md:pb-14">
        <div className="absolute inset-0 hero-harvest-bg" />
        <div className="absolute inset-0 bg-gradient-to-b from-agri-dark/10 via-transparent to-agri-green-950/35" />
        <div className="absolute -top-12 right-0 w-[28rem] h-[28rem] bg-agri-gold-300/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 left-[-4rem] w-[22rem] h-[22rem] bg-agri-green-300/10 rounded-full blur-3xl" />

        <div className="container-agri relative z-10">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-8 items-center">
            <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-white/90 text-sm font-medium mb-5 border border-white/20 animate-fade-in">
              <span className="w-2 h-2 bg-agri-green-400 rounded-full animate-pulse" />
              🇭🇹 Produits 100% haïtiens — Cultivés localement
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl md:text-5xl xl:text-6xl text-white mb-4 leading-[1.02] animate-slide-up">
              De nos champs
              <span className="block text-agri-gold-400">haïtiens</span>
              à votre table
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-white/80 mb-6 max-w-2xl animate-slide-up animate-delay-100">
              Découvrez des produits locaux haïtiens bien présentés, faciles à commander, et pensés d&apos;abord
              pour une vraie expérience d&apos;achat.
            </p>

            <form action="/shop" method="GET" className="animate-slide-up animate-delay-150 mb-6">
              <div className="rounded-[1.5rem] border border-white/20 bg-white/12 backdrop-blur-md p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-agri-dark/40">🔍</span>
                    <input
                      type="text"
                      name="search"
                      placeholder="Rechercher un produit local..."
                      className="w-full rounded-2xl border border-white/40 bg-white px-11 py-3.5 text-agri-dark placeholder:text-gray-400 outline-none transition focus:border-agri-gold-400 focus:ring-4 focus:ring-agri-gold-300/20"
                    />
                  </div>
                  <Button variant="gold" size="lg" className="sm:shrink-0">
                    Rechercher
                  </Button>
                </div>
              </div>
            </form>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up animate-delay-200">
              <Link href="/shop">
                <Button variant="primary" size="lg">
                  🛒 Acheter maintenant
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="ghost"
                  size="lg"
                  className="!text-white !border-white/30 hover:!bg-white/10 border-2"
                >
                  🌱 Découvrir AYIZAN
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7 animate-fade-in animate-delay-300">
              {STATS.map((stat) => (
                <div key={stat.label} className="p-3.5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <div className="font-display text-2xl md:text-3xl font-bold text-agri-gold-400">{stat.value}</div>
                  <div className="text-sm text-white/70 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

            <div className="hidden lg:block">
              <div className="hero-shadow-panel bg-white/12 backdrop-blur-md border border-white/20 rounded-[2rem] p-4">
                <div className="rounded-[1.6rem] overflow-hidden border border-white/10 bg-agri-dark/20">
                  <div className="aspect-[4/4.65] hero-harvest-bg bg-cover bg-center" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-3.5">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/50">Origine</div>
                    <div className="text-white font-semibold mt-2">Produits locaux d&apos;Haïti</div>
                  </div>
                  <div className="bg-agri-gold-300/15 border border-agri-gold-300/25 rounded-2xl p-3.5">
                    <div className="text-xs uppercase tracking-[0.18em] text-agri-gold-200/80">AYIZAN</div>
                    <div className="text-white font-semibold mt-2">Acheter d&apos;abord, développer ensuite</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50">
          <span className="text-xs">Défiler</span>
          <div className="w-5 h-8 border-2 border-white/30 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-white/50 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ========== RÉASSURANCE ========== */}
      <section className="bg-white border-y border-gray-100">
        <div className="container-agri py-5">
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {TRUST_POINTS.map((point) => (
              <div key={point.title} className="rounded-2xl bg-agri-cream border border-gray-100 px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{point.icon}</span>
                  <div>
                    <div className="font-semibold text-agri-dark">{point.title}</div>
                    <div className="text-sm text-gray-500 mt-1 leading-relaxed">{point.text}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== POURQUOI ACHETER CHEZ NOUS ========== */}
      <section className="section bg-agri-cream">
        <div className="container-agri">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-start">
            <div>
              <span className="text-agri-green-600 font-semibold text-sm uppercase tracking-wider">Avant tout une boutique</span>
              <h2 className="font-display text-4xl md:text-5xl text-agri-dark mt-2 mb-4">
                AGRIKIRI met d&apos;abord les produits au centre
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Le site existe d&apos;abord pour vendre des produits locaux haïtiens de manière claire, crédible
                et rassurante. Le programme AYIZAN reste important, mais il vient après l&apos;expérience d&apos;achat.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {SHOP_BENEFITS.map((benefit) => (
                <div key={benefit.title} className="card p-6">
                  <div className="text-3xl mb-4">{benefit.icon}</div>
                  <h3 className="font-semibold text-agri-dark text-lg mb-2">{benefit.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== NOS CATÉGORIES ========== */}
      <section className="py-14 md:py-16 bg-white">
        <div className="container-agri">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
            <div>
            <span className="text-agri-green-600 font-semibold text-sm uppercase tracking-wider">Notre offre</span>
              <h2 className="font-display text-3xl md:text-4xl text-agri-dark mt-2">
              Nos Catégories
            </h2>
              <p className="text-gray-500 mt-3 max-w-2xl">
                Parcourez rapidement les grandes familles de produits avant d&apos;entrer dans la boutique complète.
            </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-semibold text-agri-green-700 hover:text-agri-green-600"
            >
              Voir toute la boutique →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.slice(0, 4).map((cat, index) => {
              const categoryThemes = [
                { emoji: '🌾', color: 'from-agri-green-700 to-agri-green-500' },
                { emoji: '🫘', color: 'from-amber-700 to-amber-500' },
                { emoji: '🌽', color: 'from-yellow-700 to-yellow-500' },
                { emoji: '🌿', color: 'from-teal-700 to-teal-500' },
              ];
              const theme = categoryThemes[index % categoryThemes.length];
              const count =
                typeof cat._count?.products === 'number'
                  ? `${cat._count.products} produit(s)`
                  : 'Voir la sélection';

              return (
              <Link key={cat.id} href="/shop">
                <div className={`relative h-32 sm:h-36 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center overflow-hidden cursor-pointer group hover:shadow-agri-lg transition-all duration-300 ${cat.imageUrl ? 'bg-agri-dark' : `bg-gradient-to-br ${theme.color}`}`}>
                  {cat.imageUrl ? (
                    <>
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="absolute inset-0 h-full w-full object-cover blur-[1.5px] scale-105 transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-agri-dark/88 via-agri-dark/45 to-agri-dark/20" />
                    </>
                  ) : (
                    <div className="absolute top-3 right-3 text-3xl opacity-80 group-hover:scale-110 transition-transform">
                      {theme.emoji}
                    </div>
                  )}
                  <div className="relative z-10 flex flex-col items-center">
                    <h3 className="font-display text-lg sm:text-xl text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                      {cat.name}
                    </h3>
                    <span className="text-white/80 text-xs sm:text-sm mt-1 block drop-shadow-[0_2px_8px_rgba(0,0,0,0.28)]">
                      {count}
                    </span>
                  </div>
                </div>
              </Link>
            )})}
          </div>
          {categories.length === 0 && (
            <div className="text-center text-gray-400">
              Aucune catégorie disponible pour le moment.
            </div>
          )}
        </div>
      </section>

      {/* ========== BESTSELLERS ========== */}
      <section className="section bg-agri-cream">
        <div className="container-agri">
          <div className="text-center mb-12">
            <span className="text-agri-green-600 font-semibold text-sm uppercase tracking-wider">Nos favoris</span>
            <h2 className="font-display text-4xl md:text-5xl text-agri-dark mt-2">Bestsellers</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => {
              const badges = ['Bestseller', 'Nouveau', 'Populaire', 'À découvrir'];
              const activeVariants = (product.variants || []).filter((variant) => variant.isActive !== false);
              const primaryVariant = activeVariants.find((variant) => variant.isDefault) ?? activeVariants[0];
              const displayPrice = Number(primaryVariant?.price ?? product.price);
              const displayVp = Number(primaryVariant?.vpPoints ?? product.vpPoints);
              const imageUrl = product.images?.[0]?.url;

              return (
              <div key={product.id} className="card-hover group cursor-pointer overflow-hidden">
                <Link href={`/shop/${product.slug}`}>
                  <div className="h-40 sm:h-48 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.14),_transparent_36%),linear-gradient(135deg,_#f9fbf4_0%,_#eef6e8_100%)] flex items-center justify-center text-6xl overflow-hidden">
                  {imageUrl ? (
                    <div className="w-full h-full p-3 sm:p-5 flex items-center justify-center">
                      <img
                        src={imageUrl}
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
                  <span className="text-xs font-semibold text-agri-green-600 bg-agri-green-50 px-2 py-0.5 rounded-full">
                    {badges[index % badges.length]}
                  </span>
                  <Link href={`/shop/${product.slug}`}>
                    <h3 className="font-semibold text-agri-dark mt-2 mb-1 hover:text-agri-green-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-agri-green-700">
                      {displayPrice.toLocaleString('fr-HT')} HTG
                    </span>
                    <span className="text-xs text-agri-gold-500 font-medium bg-agri-gold-300/20 px-2 py-0.5 rounded-full">
                      {displayVp} PSK
                    </span>
                  </div>
                  <Link href={`/shop/${product.slug}`}>
                    <Button variant="primary" size="sm" className="w-full mt-3">
                      Voir le produit
                    </Button>
                  </Link>
                </div>
              </div>
            )})}
          </div>
          {products.length === 0 && (
            <div className="text-center text-gray-400">
              Aucun produit disponible pour le moment.
            </div>
          )}

          <div className="text-center mt-10">
            <Link href="/shop">
              <Button variant="secondary" size="lg">
                Voir tous les produits →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========== BANNIÈRE PROMO MLM ========== */}
      <section className="relative overflow-hidden py-16 bg-agri-green-700">
        <div className="absolute inset-0 bg-hero-pattern opacity-10" />
        <div className="absolute right-0 top-0 w-1/3 h-full bg-agri-gold-400/10 blur-3xl" />

        <div className="container-agri relative z-10">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
            <div className="max-w-2xl">
              <span className="inline-block px-4 py-1 bg-agri-gold-400/20 rounded-full text-agri-gold-300 text-sm font-semibold mb-5">
                🌱 Fonction complémentaire
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
                Après vos achats, vous pouvez aussi rejoindre le réseau AYIZAN
              </h2>
              <p className="text-lg text-white/80">
                Le programme MLM AGRIKIRI est une opportunité additionnelle pour les clients qui veulent vendre,
                parrainer et développer une activité autour de produits réels.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-3xl border border-white/15 p-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 text-white/85">
                  <span>1.</span>
                  <span>Commencez comme client et découvrez les produits.</span>
                </div>
                <div className="flex items-start gap-3 text-white/85">
                  <span>2.</span>
                  <span>Activez ensuite votre statut AYIZAN si vous voulez intégrer le réseau.</span>
                </div>
                <div className="flex items-start gap-3 text-white/85">
                  <span>3.</span>
                  <span>Accédez à votre tableau de bord, vos commissions et votre code de parrainage.</span>
                </div>
              </div>
              <Link href="/register">
                <Button variant="gold" size="lg" className="w-full">
                  🌱 Commencer avec AGRIKIRI
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 3 SOURCES DE REVENUS ========== */}
      <section className="section bg-white">
        <div className="container-agri">
          <div className="text-center mb-12">
            <span className="text-agri-green-600 font-semibold text-sm uppercase tracking-wider">Si vous rejoignez AYIZAN</span>
            <h2 className="font-display text-4xl md:text-5xl text-agri-dark mt-2">
              Le réseau MLM en résumé
            </h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">
              Une vue simple de l&apos;opportunité réseau, sans enlever la priorité donnée aux produits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {REVENUE_SOURCES.map((source, i) => (
              <div key={source.title} className={`card p-8 border-2 ${source.color}`}>
                <div className="text-4xl mb-4">{source.icon}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Source {i + 1}</div>
                <h3 className="font-display text-2xl text-agri-dark mb-3">{source.title}</h3>
                <p className="text-gray-600 mb-4">{source.description}</p>
                <span className="text-sm font-semibold text-agri-green-600 bg-agri-green-50 px-3 py-1 rounded-full">
                  {source.example}
                </span>
              </div>
            ))}
          </div>

          {/* Niveaux preview */}
          <div className="text-center mb-8">
            <h3 className="font-display text-3xl text-agri-dark">8 Niveaux MLM</h3>
            <p className="text-gray-500 mt-2">Inspirés des héros de la Révolution Haïtienne</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MLM_LEVELS_PREVIEW.map((level) => (
              <div
                key={level.name}
                className={`p-4 rounded-2xl border-2 ${level.color} text-center`}
              >
                <div className="text-3xl mb-2">{level.icon}</div>
                <div className={`font-semibold ${level.textColor}`}>{level.name}</div>
                <div className="text-sm text-gray-500 mt-1">{level.commission} HTG/mois</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/register">
              <Button variant="primary" size="lg">
                Rejoindre le réseau →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
