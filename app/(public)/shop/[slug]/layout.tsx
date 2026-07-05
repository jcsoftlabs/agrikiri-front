import type { Metadata } from 'next';
import { fetchPublicProductBySlug } from '@/lib/site';

function cleanText(value?: string | null, fallback = '') {
  return (value || fallback).replace(/\s+/g, ' ').trim();
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await fetchPublicProductBySlug(params.slug);

  if (!product) {
    return {
      title: 'Produit AGRIKIRI',
      description: 'Découvrez les produits AGRIKIRI et leurs formats disponibles.',
      alternates: {
        canonical: `/shop/${params.slug}`,
      },
    };
  }

  const category = cleanText(product.category?.name, 'Produit local haïtien');
  const description = cleanText(
    product.description,
    `${product.name} disponible chez AGRIKIRI. Découvrez les formats, le prix et les informations de livraison.`
  );
  const image = product.images?.[0]?.url || '/images/logo.png';

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/shop/${product.slug || params.slug}`,
    },
    openGraph: {
      title: product.name,
      description,
      url: `/shop/${product.slug || params.slug}`,
      type: 'website',
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      images: [image],
    },
    keywords: [product.name, category, 'AGRIKIRI', 'produit local haïtien'],
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
