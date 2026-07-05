import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boutique AGRIKIRI',
  description:
    'Parcourez la boutique AGRIKIRI et découvrez des produits locaux haïtiens avec formats, prix et disponibilité mis à jour.',
  alternates: {
    canonical: '/shop',
  },
  openGraph: {
    title: 'Boutique AGRIKIRI',
    description:
      'Parcourez la boutique AGRIKIRI et découvrez des produits locaux haïtiens avec formats, prix et disponibilité mis à jour.',
    url: '/shop',
    type: 'website',
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
