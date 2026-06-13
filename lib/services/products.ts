import api from '../api';

// ==========================================
// TYPES
// ==========================================

export interface ProductImage {
  id: string;
  url: string;
  publicId: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductVariantPricingTier {
  id?: string;
  minQuantity: number;
  maxQuantity?: number | null;
  price: number | string;
  sortOrder?: number;
}

export interface ProductVariant {
  id?: string;
  label: string;
  price: number | string;
  vpPoints: number | string;
  weightLbs: number | string;
  stockQuantity: number;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  pricingTiers?: ProductVariantPricingTier[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  imagePublicId?: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number | string;
  vpPoints: number | string;
  weightLbs: number | string;
  stockQuantity: number;
  isActive: boolean;
  category?: Category;
  categoryId?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductsApiResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface CreateProductPayload {
  name: string;
  description: string;
  categoryId: string;
  variants: ProductVariant[];
  images: { url: string; publicId: string }[];
  isActive?: boolean;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {}

// ==========================================
// PRODUCT QUERIES (Public)
// ==========================================

export const getProducts = async (params?: Record<string, any>): Promise<ProductsApiResponse['data']> => {
  const { data } = await api.get<ProductsApiResponse>('/products', { params });
  // Backend retourne { success: true, data: { products, pagination } }
  return data.data;
};

// Version pour l'admin — inclut tous les produits (actifs et inactifs)
export const getAdminProducts = async (params?: Record<string, any>): Promise<ProductsApiResponse['data']> => {
  const { data } = await api.get<ProductsApiResponse>('/products', {
    params: {
      ...params,
      adminMode: true,
      limit: 100,
      _cb: Date.now(),
    },
  });
  return data.data;
};

export const getProductBySlug = async (slug: string): Promise<Product> => {
  const { data } = await api.get(`/products/${slug}`);
  return data.data;
};

// ==========================================
// CATEGORIES
// ==========================================

export const getCategories = async (): Promise<Category[]> => {
  // URL correcte : /products/categories (pas /categories)
  const { data } = await api.get('/products/categories');
  return data.data;
};

export const createCategory = async (payload: {
  name: string;
  description?: string;
  imageUrl?: string;
  imagePublicId?: string;
}): Promise<Category> => {
  const { data } = await api.post('/products/categories', payload);
  return data.data;
};

export const updateCategory = async (
  id: string,
  payload: { name?: string; description?: string; imageUrl?: string; imagePublicId?: string }
): Promise<Category> => {
  const { data } = await api.patch(`/products/categories/${id}`, payload);
  return data.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/products/categories/${id}`);
};

// ==========================================
// PRODUCT MUTATIONS (Admin)
// ==========================================

export const createProduct = async (payload: CreateProductPayload): Promise<Product> => {
  const { data } = await api.post('/products', payload);
  return data.data;
};

export const updateProduct = async (id: string, payload: UpdateProductPayload): Promise<Product> => {
  const { data } = await api.patch(`/products/${id}`, payload);
  return data.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/products/${id}`);
};

export const addProductImages = async (
  productId: string,
  images: { url: string; publicId: string }[]
): Promise<ProductImage[]> => {
  const { data } = await api.post(`/products/${productId}/images`, { images });
  return data.data;
};

export const deleteProductImage = async (productId: string, imageId: string): Promise<void> => {
  await api.delete(`/products/${productId}/images/${imageId}`);
};

// ==========================================
// UPLOAD (Cloudinary via backend)
// ==========================================

// Upload d'images produit — retourne tableau de { url, publicId }
export const uploadProductImages = async (
  files: File[]
): Promise<{ url: string; publicId: string }[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  const { data } = await api.post('/upload/product-images', formData);

  // Backend retourne { success: true, data: [{ url, publicId }] }
  return data.data;
};

// Upload d'image de catégorie
export const uploadCategoryImage = async (
  file: File
): Promise<{ url: string; publicId: string }> => {
  const formData = new FormData();
  formData.append('image', file);

  const { data } = await api.post('/upload/category-image', formData);

  // Backend retourne { success: true, data: { url, publicId } }
  return data.data;
};
