import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/shop/ProductDetailClient';
import { fetchPublicProductBySlug, fetchPublicProducts, SITE_URL } from '@/lib/site';

export const revalidate = 300;

export async function generateStaticParams() {
  const products = await fetchPublicProducts('?limit=500&sortBy=updatedAt&sortOrder=desc');
  return products
    .filter((product: any) => product?.slug)
    .map((product: any) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await fetchPublicProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const selectedImage = product.images?.[0]?.url || `${SITE_URL}/images/logo.png`;
  const basePrice = Number(product.price || 0);
  const stock = Number(product.stockQuantity || 0);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: (product.images || []).map((image: any) => image.url),
    sku: product.id,
    category: product.category?.name || 'Produit local haïtien',
    brand: {
      '@type': 'Brand',
      name: 'AGRIKIRI',
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/shop/${product.slug}`,
      priceCurrency: 'HTG',
      price: Number.isFinite(basePrice) ? basePrice.toFixed(2) : '0.00',
      availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      image: selectedImage,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
