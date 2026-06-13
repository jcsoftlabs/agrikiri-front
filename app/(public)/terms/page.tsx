import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: "Conditions d'utilisation — AGRIKIRI",
  description: "Conditions générales d'utilisation de la plateforme AGRIKIRI.",
};

const sections = [
  {
    title: 'Utilisation de la plateforme',
    text: "AGRIKIRI permet la consultation, l’achat de produits et l’accès à certaines fonctionnalités de compte, de suivi et de réseau selon le profil de l’utilisateur.",
  },
  {
    title: 'Comptes utilisateurs',
    text: "L’utilisateur est responsable de l’exactitude des informations fournies lors de l’inscription et de la confidentialité de ses accès.",
  },
  {
    title: 'Commandes et disponibilité',
    text: "Les produits, variantes, prix et disponibilités affichés sur la plateforme peuvent évoluer. Une commande est considérée selon les règles de traitement et de paiement définies par AGRIKIRI.",
  },
  {
    title: 'Livraison',
    text: "Les délais et modalités de livraison dépendent de la zone desservie, du mode de livraison choisi et de l’organisation logistique disponible au moment de la commande.",
  },
  {
    title: 'Programme AYIZAN',
    text: "Le programme AYIZAN constitue une fonctionnalité complémentaire de la plateforme et ne remplace pas la vocation principale e-commerce du site.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-agri-cream">
      <Navbar />

      <main className="pt-24">
        <section className="container-agri py-16 lg:py-20">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-gray-100 bg-white p-8 lg:p-10 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-agri-green-200 bg-agri-green-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-agri-green-700">
              Conditions
            </div>

            <h1 className="mt-6 font-display text-4xl text-agri-dark">Conditions d’utilisation</h1>
            <p className="mt-5 text-base leading-8 text-gray-600">
              Cette page constitue une base de présentation des conditions applicables à l’usage de la plateforme AGRIKIRI.
              Elle peut être enrichie et formalisée davantage au moment de la mise en production juridique finale.
            </p>

            <div className="mt-10 space-y-6">
              {sections.map((section) => (
                <div key={section.title} className="rounded-3xl border border-gray-100 bg-agri-cream/60 p-6">
                  <h2 className="text-xl font-semibold text-agri-dark">{section.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{section.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
