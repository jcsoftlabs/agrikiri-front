import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'À propos — AGRIKIRI',
  description:
    "Découvrez AGRIKIRI, sa mission, sa vision et son engagement pour la valorisation des produits locaux haïtiens.",
};

const PILLARS = [
  {
    title: 'Produits locaux valorisés',
    text: 'Nous mettons en avant des produits haïtiens réels, accessibles, clairement présentés et pensés pour une consommation quotidienne.',
    icon: '🌿',
  },
  {
    title: 'Commerce simple et fiable',
    text: 'Le site est conçu pour permettre au client d’acheter facilement, de suivre ses commandes et d’avoir des informations utiles avant achat.',
    icon: '🛒',
  },
  {
    title: 'Réseau AYIZAN en complément',
    text: 'Le programme AYIZAN vient soutenir la distribution locale, sans faire oublier que le coeur du projet reste la vente de produits.',
    icon: '🤝',
  },
];

const VALUES = [
  'Soutenir la production haïtienne',
  'Rendre les produits locaux plus visibles',
  'Créer une expérience d’achat claire et moderne',
  'Offrir une opportunité de distribution locale structurée',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-agri-cream">
      <Navbar />

      <main className="pt-24">
        <section className="container-agri py-14 lg:py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-agri-green-200 bg-agri-green-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-agri-green-700">
              À propos d’AGRIKIRI
            </div>
            <h1 className="mt-6 font-display text-4xl lg:text-6xl text-agri-dark leading-tight">
              Une plateforme pensée pour faire circuler les produits locaux haïtiens plus loin.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">
              AGRIKIRI est une plateforme e-commerce orientée vers la mise en valeur des produits locaux haïtiens.
              Notre ambition est simple : mieux connecter l’offre locale aux consommateurs, tout en construisant
              un réseau de distribution plus structuré autour du programme AYIZAN.
            </p>
          </div>
        </section>

        <section className="container-agri pb-16">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-agri-green-100 bg-white p-8 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-agri-green-700">Notre mission</p>
              <h2 className="mt-4 font-display text-3xl text-agri-dark">Faire grandir la confiance autour du local.</h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                Nous voulons donner aux produits locaux une présence digitale forte, crédible et simple à utiliser.
                Cela passe par une boutique claire, des informations produit plus propres, un parcours d’achat fluide,
                et un accompagnement logistique qui reste proche de la réalité du terrain en Haïti.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {VALUES.map((value) => (
                  <div
                    key={value}
                    className="rounded-2xl border border-gray-100 bg-agri-cream/70 px-4 py-4 text-sm font-medium text-agri-dark"
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-agri-green-700 p-8 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Vision</p>
              <h2 className="mt-4 font-display text-3xl leading-tight">
                De nos champs haïtiens à la table du client, avec plus de clarté et plus de portée.
              </h2>
              <p className="mt-6 text-base leading-8 text-white/80">
                AGRIKIRI veut devenir une vitrine digitale solide pour les produits locaux, avec un modèle hybride :
                une vraie boutique en ligne d’abord, et un réseau de distribution AYIZAN ensuite pour élargir l’impact.
              </p>

              <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">Ce que nous construisons</div>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-white/85">
                  <li>Une boutique plus lisible pour les clients</li>
                  <li>Un suivi de commande plus structuré</li>
                  <li>Une logistique locale mieux organisée</li>
                  <li>Un réseau AYIZAN utile, sans masquer la vocation e-commerce</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="container-agri pb-16 lg:pb-20">
          <div className="rounded-[2rem] border border-gray-100 bg-white p-8 lg:p-10 shadow-sm">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-agri-green-700">Nos piliers</p>
              <h2 className="mt-4 font-display text-3xl text-agri-dark">Une plateforme utile, crédible et locale.</h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {PILLARS.map((pillar) => (
                <div key={pillar.title} className="rounded-3xl border border-gray-100 bg-agri-cream/60 p-6">
                  <div className="text-3xl">{pillar.icon}</div>
                  <h3 className="mt-4 text-xl font-semibold text-agri-dark">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{pillar.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-agri pb-20">
          <div className="rounded-[2rem] border border-agri-green-100 bg-gradient-to-r from-agri-green-50 to-[#f8fbf3] p-8 lg:p-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-agri-green-700">Découvrir AGRIKIRI</p>
              <h2 className="mt-3 font-display text-3xl text-agri-dark">Explore la boutique ou rejoins le réseau au bon moment.</h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                Le plus simple est de commencer par découvrir les produits. Ensuite, si l’opportunité te parle, le programme AYIZAN reste disponible comme complément.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-2xl bg-agri-green-700 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Voir la boutique
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl border border-agri-green-200 bg-white px-6 py-3 text-sm font-semibold text-agri-green-700 transition hover:bg-agri-green-50"
              >
                Rejoindre AGRIKIRI
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
