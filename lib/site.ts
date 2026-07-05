export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://www.agrikiri.com';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://agrikiri-backend-production.up.railway.app/api'
    : 'http://localhost:3001/api');

export async function fetchPublicProducts(params = '') {
  try {
    const response = await fetch(`${API_BASE_URL}/products${params}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return payload?.data?.products || [];
  } catch {
    return [];
  }
}

export async function fetchPublicProductBySlug(slug: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${slug}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload?.data || null;
  } catch {
    return null;
  }
}
