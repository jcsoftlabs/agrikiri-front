import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Confidentialité — AGRIKIRI',
  description: 'Informations sur la confidentialité et le traitement des données sur AGRIKIRI.',
};

const privacyPoints = [
  'Les informations de compte servent à l’authentification, au suivi de commande et à la gestion du profil utilisateur.',
  'Les adresses de livraison servent exclusivement au traitement logistique et au bon acheminement des commandes.',
  'Les informations de commande et de paiement sont utilisées pour le suivi transactionnel et administratif de la plateforme.',
  'Les données strictement nécessaires peuvent être affichées à l’équipe logistique pour assurer la livraison.',
  'AGRIKIRI peut faire évoluer cette politique au fur et à mesure de la structuration du service.',
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-agri-cream">
      <Navbar />

      <main className="pt-24">
        <section className="container-agri py-16 lg:py-20">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-gray-100 bg-white p-8 lg:p-10 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-agri-green-200 bg-agri-green-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-agri-green-700">
              Confidentialité
            </div>

            <h1 className="mt-6 font-display text-4xl text-agri-dark">Politique de confidentialité</h1>
            <p className="mt-5 text-base leading-8 text-gray-600">
              AGRIKIRI collecte et traite certaines informations nécessaires au fonctionnement de la boutique,
              à la gestion des comptes utilisateurs, à la livraison et au suivi des commandes.
            </p>

            <div className="mt-10 rounded-[2rem] border border-gray-100 bg-agri-cream/60 p-7">
              <h2 className="text-xl font-semibold text-agri-dark">Principes généraux</h2>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-gray-600">
                {privacyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
