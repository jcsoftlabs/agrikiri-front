'use client';

import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminSidebar from '@/components/admin/AdminSidebar';
import Button from '@/components/ui/Button';
import {
  getAdminProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImages,
  deleteProductImage,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadProductImages,
  uploadCategoryImage,
  type Product,
  type ProductVariant,
  type ProductVariantPricingTier,
  type Category,
  type CreateProductPayload,
  type UpdateProductPayload,
} from '@/lib/services/products';

// ==========================================
// TYPES LOCAUX
// ==========================================

type Tab = 'products' | 'categories';

interface ProductFormData {
  name: string;
  description: string;
  categoryId: string;
  isActive: boolean;
  variants: ProductVariantFormData[];
}

interface ProductVariantFormData {
  id?: string;
  label: string;
  price: string;
  vpPoints: string;
  weightLbs: string;
  stockQuantity: string;
  pricingTiers: ProductVariantPricingTierFormData[];
}

interface ProductVariantPricingTierFormData {
  id?: string;
  minQuantity: string;
  maxQuantity: string;
  price: string;
}

interface CategoryFormData {
  name: string;
  description: string;
}

type AdminProductsQueryData = {
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

const EMPTY_PRODUCT_FORM: ProductFormData = {
  name: '',
  description: '',
  categoryId: '',
  isActive: true,
  variants: [
    {
      label: '',
      price: '',
      vpPoints: '',
      weightLbs: '',
      stockQuantity: '0',
      pricingTiers: [],
    },
  ],
};

const EMPTY_CATEGORY_FORM: CategoryFormData = { name: '', description: '' };

function createEmptyVariant(): ProductVariantFormData {
  return {
    label: '',
    price: '',
    vpPoints: '',
    weightLbs: '',
    stockQuantity: '0',
    pricingTiers: [],
  };
}

function createEmptyPricingTier(): ProductVariantPricingTierFormData {
  return {
    minQuantity: '',
    maxQuantity: '',
    price: '',
  };
}

function mapVariantToForm(variant: ProductVariant): ProductVariantFormData {
  return {
    id: variant.id,
    label: variant.label,
    price: String(variant.price),
    vpPoints: String(variant.vpPoints),
    weightLbs: String(variant.weightLbs),
    stockQuantity: String(variant.stockQuantity),
    pricingTiers: (variant.pricingTiers || []).map((tier) => ({
      id: tier.id,
      minQuantity: String(tier.minQuantity),
      maxQuantity: tier.maxQuantity != null ? String(tier.maxQuantity) : '',
      price: String(tier.price),
    })),
  };
}

function getActiveVariants(product: Product) {
  return (product.variants || []).filter((variant) => variant.isActive !== false);
}

function getPrimaryVariant(product: Product) {
  const activeVariants = getActiveVariants(product);
  return activeVariants.find((variant) => variant.isDefault) ?? activeVariants[0];
}

function getVariantPriceRange(product: Product) {
  const activeVariants = getActiveVariants(product);
  if (activeVariants.length === 0) return null;

  const prices = activeVariants.map((variant) => Number(variant.price));
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
      isActive
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-red-50 text-red-600 border border-red-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`} />
      {isActive ? 'Actif' : 'Inactif'}
    </span>
  );
}

function StockBadge({ qty }: { qty: number }) {
  if (qty === 0) return <span className="text-xs font-semibold text-red-600">Rupture</span>;
  if (qty < 10) return <span className="text-xs font-semibold text-orange-500">{qty} (faible)</span>;
  return <span className="text-xs font-semibold text-gray-700">{qty}</span>;
}

function ImageDropzone({
  files,
  onChange,
  label = 'images',
  multiple = true,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
  multiple?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    onChange(multiple ? dropped : [dropped[0]]);
  }, [multiple, onChange]);

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-agri-green-400 bg-agri-green-50'
            : 'border-gray-200 hover:border-agri-green-300 hover:bg-gray-50'
        }`}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="text-3xl mb-2">📸</div>
        <p className="text-sm text-gray-500 font-medium">
          {files.length > 0
            ? `${files.length} fichier(s) sélectionné(s)`
            : `Glissez vos ${label} ici ou cliquez`}
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP — max 5 Mo par image</p>
        <input
          type="file"
          multiple={multiple}
          accept="image/*"
          className="hidden"
          ref={ref}
          onChange={(e) => {
            if (e.target.files) {
              const arr = Array.from(e.target.files);
              onChange(multiple ? arr : [arr[0]]);
            }
          }}
        />
      </div>

      {/* Prévisualisation */}
      {files.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {files.map((file, i) => (
            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="absolute inset-0 bg-black/50 text-white text-xs hidden group-hover:flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // ---- Product Modal State ----
  const [productModal, setProductModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    product?: Product;
  }>({ open: false, mode: 'create' });
  const [productForm, setProductForm] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; isPrimary?: boolean } | null>(null);

  // ---- Category Modal State ----
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    category?: Category;
  }>({ open: false, mode: 'create' });
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(EMPTY_CATEGORY_FORM);
  const [categoryFile, setCategoryFile] = useState<File[]>([]);

  // ==========================================
  // DATA FETCHING
  // ==========================================

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => getAdminProducts(),
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: getCategories,
  });

  const allProducts = productsData?.products ?? [];

  // Filtrage local
  const filteredProducts = allProducts.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || p.categoryId === filterCategory;
    return matchSearch && matchCat;
  });

  const buildVariantPayload = (variants: ProductVariantFormData[]): ProductVariant[] => {
    const cleaned = variants
      .map((variant) => ({
        id: variant.id,
        label: variant.label.trim(),
        price: Number(variant.price),
        vpPoints: Number(variant.vpPoints),
        weightLbs: Number(variant.weightLbs),
        stockQuantity: Number(variant.stockQuantity),
        pricingTiers: (variant.pricingTiers || [])
          .map((tier, index) => ({
            id: tier.id,
            minQuantity: Number(tier.minQuantity),
            maxQuantity: tier.maxQuantity.trim() ? Number(tier.maxQuantity) : null,
            price: Number(tier.price),
            sortOrder: index,
          }))
          .filter((tier) => !Number.isNaN(tier.minQuantity) && !Number.isNaN(tier.price)),
      }))
      .filter((variant) => variant.label);

    if (cleaned.length === 0) {
      throw new Error('Ajoutez au moins une variante active.');
    }

    if (
      cleaned.some(
        (variant) =>
          Number.isNaN(variant.price) ||
          Number.isNaN(variant.vpPoints) ||
          Number.isNaN(variant.weightLbs) ||
          Number.isNaN(variant.stockQuantity) ||
          variant.pricingTiers.some(
            (tier) =>
              Number.isNaN(tier.minQuantity) ||
              Number.isNaN(Number(tier.price)) ||
              (tier.maxQuantity !== null && Number.isNaN(Number(tier.maxQuantity)))
          )
      )
    ) {
      throw new Error('Toutes les variantes doivent avoir des valeurs numeriques valides.');
    }

    return cleaned;
  };

  // ==========================================
  // MUTATIONS — PRODUITS
  // ==========================================

  const createProdMut = useMutation({
    mutationFn: async (form: ProductFormData) => {
      setIsUploadingImages(true);
      let images: { url: string; publicId: string }[] = [];
      const variants = buildVariantPayload(form.variants);

      if (productFiles.length > 0) {
        const uploaded = await uploadProductImages(productFiles);
        images = uploaded;
      }
      setIsUploadingImages(false);

      if (images.length === 0) throw new Error('Veuillez sélectionner au moins une image.');

      const payload: CreateProductPayload = {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId,
        isActive: form.isActive,
        variants,
        images,
      };
      return createProduct(payload);
    },
    onSuccess: (createdProduct) => {
      queryClient.setQueryData<AdminProductsQueryData | undefined>(['admin-products'], (current) => {
        if (!current) return current;

        const products = [createdProduct, ...current.products.filter((product) => product.id !== createdProduct.id)]
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        return {
          ...current,
          products,
          pagination: {
            ...current.pagination,
            total: current.pagination.total + 1,
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setActiveTab('products');
      setSearch('');
      setFilterCategory('');
      toast.success('✅ Produit créé avec succès !');
      setProductModal({ open: false, mode: 'create' });
      setProductFiles([]);
    },
    onError: (err: any) => {
      setIsUploadingImages(false);
      toast.error(err?.response?.data?.message || err.message || 'Erreur lors de la création');
    },
  });

  const updateProdMut = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: ProductFormData }) => {
      setIsUploadingImages(true);
      const variants = buildVariantPayload(form.variants);

      const payload: UpdateProductPayload = {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId,
        isActive: form.isActive,
        variants,
      };

      try {
        const updatedProduct = await updateProduct(id, payload);

        if (productFiles.length > 0) {
          const uploadedImages = await uploadProductImages(productFiles);
          await addProductImages(id, uploadedImages);
        }

        return updatedProduct;
      } finally {
        setIsUploadingImages(false);
      }
    },
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData<AdminProductsQueryData | undefined>(['admin-products'], (current) => {
        if (!current) return current;

        return {
          ...current,
          products: current.products.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('✅ Produit mis à jour !');
      setProductModal({ open: false, mode: 'create' });
      setProductFiles([]);
    },
    onError: (err: any) => {
      setIsUploadingImages(false);
      toast.error(err?.response?.data?.message || 'Erreur de mise à jour');
    },
  });

  const deleteProdMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Produit supprimé');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur de suppression'),
  });

  // ==========================================
  // MUTATIONS — IMAGES PRODUIT
  // ==========================================

  const deleteImgMut = useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      deleteProductImage(productId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Image supprimée');
    },
    onError: () => toast.error('Erreur lors de la suppression de l\'image'),
  });

  // ==========================================
  // MUTATIONS — CATÉGORIES
  // ==========================================

  const createCatMut = useMutation({
    mutationFn: async (form: CategoryFormData) => {
      let imageData: { url: string; publicId: string } | undefined;
      if (categoryFile.length > 0) {
        imageData = await uploadCategoryImage(categoryFile[0]);
      }
      return createCategory({
        name: form.name,
        description: form.description || undefined,
        ...(imageData && { imageUrl: imageData.url, imagePublicId: imageData.publicId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('✅ Catégorie créée !');
      setCategoryModal({ open: false, mode: 'create' });
      setCategoryFile([]);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur de création'),
  });

  const updateCatMut = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: CategoryFormData }) => {
      let imageData: { url: string; publicId: string } | undefined;
      if (categoryFile.length > 0) {
        imageData = await uploadCategoryImage(categoryFile[0]);
      }
      return updateCategory(id, {
        name: form.name,
        description: form.description || undefined,
        ...(imageData && { imageUrl: imageData.url, imagePublicId: imageData.publicId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('✅ Catégorie mise à jour !');
      setCategoryModal({ open: false, mode: 'create' });
      setCategoryFile([]);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur de mise à jour'),
  });

  const deleteCatMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Catégorie supprimée');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur de suppression'),
  });

  // ==========================================
  // HANDLERS
  // ==========================================

  const openCreateProduct = () => {
    setProductForm(EMPTY_PRODUCT_FORM);
    setProductFiles([]);
    setProductModal({ open: true, mode: 'create' });
  };

  const openEditProduct = (p: Product) => {
    const variants = getActiveVariants(p);
    setProductForm({
      name: p.name,
      description: p.description,
      categoryId: p.categoryId ?? '',
      isActive: p.isActive,
      variants: variants.length > 0 ? variants.map(mapVariantToForm) : [createEmptyVariant()],
    });
    setProductFiles([]);
    setPreviewImage(null);
    setProductModal({ open: true, mode: 'edit', product: p });
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productModal.mode === 'edit' && productModal.product) {
      updateProdMut.mutate({ id: productModal.product.id, form: productForm });
    } else {
      createProdMut.mutate(productForm);
    }
  };

  const updateVariantField = (
    index: number,
    field: keyof ProductVariantFormData,
    value: string
  ) => {
    setProductForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      ),
    }));
  };

  const updatePricingTierField = (
    variantIndex: number,
    tierIndex: number,
    field: keyof ProductVariantPricingTierFormData,
    value: string
  ) => {
    setProductForm((current) => ({
      ...current,
      variants: current.variants.map((variant, currentVariantIndex) =>
        currentVariantIndex === variantIndex
          ? {
              ...variant,
              pricingTiers: (variant.pricingTiers || []).map((tier, currentTierIndex) =>
                currentTierIndex === tierIndex ? { ...tier, [field]: value } : tier
              ),
            }
          : variant
      ),
    }));
  };

  const addVariantRow = () => {
    setProductForm((current) => ({
      ...current,
      variants: [...current.variants, createEmptyVariant()],
    }));
  };

  const removeVariantRow = (index: number) => {
    setProductForm((current) => ({
      ...current,
      variants:
        current.variants.length === 1
          ? [createEmptyVariant()]
          : current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  };

  const addPricingTierRow = (variantIndex: number) => {
    setProductForm((current) => ({
      ...current,
      variants: current.variants.map((variant, currentVariantIndex) =>
        currentVariantIndex === variantIndex
          ? {
              ...variant,
              pricingTiers: [...(variant.pricingTiers || []), createEmptyPricingTier()],
            }
          : variant
      ),
    }));
  };

  const removePricingTierRow = (variantIndex: number, tierIndex: number) => {
    setProductForm((current) => ({
      ...current,
      variants: current.variants.map((variant, currentVariantIndex) =>
        currentVariantIndex === variantIndex
          ? {
              ...variant,
              pricingTiers: (variant.pricingTiers || []).filter((_, currentTierIndex) => currentTierIndex !== tierIndex),
            }
          : variant
      ),
    }));
  };

  const openCreateCategory = () => {
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setCategoryFile([]);
    setCategoryModal({ open: true, mode: 'create' });
  };

  const openEditCategory = (cat: Category) => {
    setCategoryForm({ name: cat.name, description: cat.description ?? '' });
    setCategoryFile([]);
    setCategoryModal({ open: true, mode: 'edit', category: cat });
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryModal.mode === 'edit' && categoryModal.category) {
      updateCatMut.mutate({ id: categoryModal.category.id, form: categoryForm });
    } else {
      createCatMut.mutate(categoryForm);
    }
  };

  const isProdPending = createProdMut.isPending || updateProdMut.isPending || isUploadingImages;
  const isCatPending = createCatMut.isPending || updateCatMut.isPending;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-agri-cream flex">
      <AdminSidebar />

      <main className="flex-1 lg:ml-64 p-6 lg:p-8 min-h-screen">
        {/* ── En-tête ── */}
        <div className="mb-8">
          <h1 className="font-display text-3xl text-agri-dark">Gestion du Catalogue</h1>
          <p className="text-gray-500 mt-1">
            {allProducts.length} produit(s) · {categories.length} catégorie(s) — connecté à PostgreSQL & Cloudinary
          </p>
        </div>

        {/* ── Onglets ── */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          {(['products', 'categories'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all -mb-px border-b-2 ${
                activeTab === tab
                  ? 'border-agri-green-600 text-agri-green-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-agri-dark'
              }`}
            >
              {tab === 'products' ? `📦 Produits (${allProducts.length})` : `🏷️ Catégories (${categories.length})`}
            </button>
          ))}
        </div>

        {/* ==========================================
              TAB : PRODUITS
            ========================================== */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-3 flex-1 min-w-0">
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  <input
                    className="input pl-9"
                    placeholder="Rechercher un produit..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="input max-w-[180px]"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
                    toast.success('Liste des produits actualisée.');
                  }}
                >
                  ↻ Rafraîchir
                </Button>
                <Button variant="primary" onClick={openCreateProduct} id="btn-add-product">
                  + Ajouter un produit
                </Button>
              </div>
            </div>

            {/* Table produits */}
            {loadingProducts ? (
              <ProductTableSkeleton />
            ) : filteredProducts.length === 0 ? (
              <div className="card p-16 text-center">
                <div className="text-5xl mb-4">📦</div>
                <p className="font-semibold text-agri-dark text-lg">Aucun produit trouvé</p>
                <p className="text-gray-400 mt-1 text-sm">
                  {search || filterCategory ? 'Modifiez vos filtres' : 'Commencez par créer votre premier produit'}
                </p>
                {!search && !filterCategory && (
                  <Button variant="primary" className="mt-4" onClick={openCreateProduct}>
                    + Créer un produit
                  </Button>
                )}
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="space-y-4 p-4 lg:hidden">
                  {filteredProducts.map((p) => {
                    const primaryVariant = getPrimaryVariant(p);
                    const priceRange = getVariantPriceRange(p);
                    const activeVariants = getActiveVariants(p);

                    return (
                      <div key={p.id} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                            {p.images && p.images.length > 0 ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.images.find((i) => i.isPrimary)?.url || p.images[0].url}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">🖼️</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-agri-dark">{p.name}</div>
                            <div className="text-xs text-gray-400 font-mono mt-1">{p.id.slice(0, 8)}…</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <StatusBadge isActive={p.isActive} />
                              <span className="text-xs bg-agri-green-50 text-agri-green-700 px-2 py-1 rounded-full font-medium">
                                {p.category?.name || 'Non classé'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl bg-agri-cream border border-gray-100 p-3">
                            <div className="text-gray-400">Prix</div>
                            <div className="font-bold text-agri-green-700 mt-1">
                              {priceRange && priceRange.min !== priceRange.max
                                ? `De ${priceRange.min.toLocaleString('fr-HT')} à ${priceRange.max.toLocaleString('fr-HT')}`
                                : `${Number(primaryVariant?.price ?? p.price).toLocaleString('fr-HT')} HTG`}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-agri-cream border border-gray-100 p-3">
                            <div className="text-gray-400">PSK / Stock</div>
                            <div className="font-bold text-agri-dark mt-1">
                              {Number(primaryVariant?.vpPoints ?? p.vpPoints)} PSK · {p.stockQuantity}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-sm text-gray-500">
                            {activeVariants.length > 0 ? `${activeVariants.length} variante(s)` : 'Aucune variante'}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              id={`edit-product-mobile-${p.id}`}
                              onClick={() => openEditProduct(p)}
                              className="text-xs font-semibold text-agri-green-600 hover:bg-agri-green-50 px-3 py-2 rounded-xl transition-colors"
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              id={`delete-product-mobile-${p.id}`}
                              onClick={() => {
                                if (confirm(`Supprimer "${p.name}" définitivement ?\nSes images Cloudinary seront aussi supprimées.`)) {
                                  deleteProdMut.mutate(p.id);
                                }
                              }}
                              disabled={deleteProdMut.isPending}
                              className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="overflow-x-auto">
                  <table className="table-agri hidden lg:table">
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Catégorie</th>
                        <th>Prix (HTG)</th>
                        <th>PSK</th>
                        <th>Variantes</th>
                        <th>Stock</th>
                        <th>Statut</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => {
                        const primaryVariant = getPrimaryVariant(p);
                        const priceRange = getVariantPriceRange(p);
                        const activeVariants = getActiveVariants(p);

                        return (
                        <tr key={p.id}>
                          {/* Nom + Image */}
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                                {p.images && p.images.length > 0 ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={p.images.find((i) => i.isPrimary)?.url || p.images[0].url}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">
                                    🖼️
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-agri-dark text-sm">{p.name}</div>
                                <div className="text-xs text-gray-400 font-mono">{p.id.slice(0, 8)}…</div>
                                {p.images && p.images.length > 1 && (
                                  <div className="text-xs text-agri-green-600">+{p.images.length - 1} image(s)</div>
                                )}
                                {activeVariants.length > 0 && (
                                  <div className="text-xs text-gray-400">
                                    {activeVariants.length} variante(s)
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="text-xs bg-agri-green-50 text-agri-green-700 px-2 py-1 rounded-full font-medium">
                              {p.category?.name || <span className="text-gray-400 italic">Non classé</span>}
                            </span>
                          </td>
                          <td className="font-bold text-agri-green-700">
                            {priceRange && priceRange.min !== priceRange.max
                              ? `De ${priceRange.min.toLocaleString('fr-HT')} a ${priceRange.max.toLocaleString('fr-HT')} HTG`
                              : `${Number(primaryVariant?.price ?? p.price).toLocaleString('fr-HT')} HTG`}
                          </td>
                          <td className="font-semibold text-agri-gold-600">
                            {Number(primaryVariant?.vpPoints ?? p.vpPoints)}
                          </td>
                          <td className="text-gray-600">
                            {activeVariants.length > 0 ? (
                              <div className="text-xs">
                                <div className="font-semibold text-agri-dark">{activeVariants[0].label}</div>
                                {activeVariants.length > 1 && (
                                  <div className="text-gray-400">+{activeVariants.length - 1} autre(s)</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Aucune</span>
                            )}
                          </td>
                          <td><StockBadge qty={p.stockQuantity} /></td>
                          <td><StatusBadge isActive={p.isActive} /></td>
                          <td>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                id={`edit-product-${p.id}`}
                                onClick={() => openEditProduct(p)}
                                className="text-xs font-semibold text-agri-green-600 hover:bg-agri-green-50 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                ✏️ Modifier
                              </button>
                              <button
                                id={`delete-product-${p.id}`}
                                onClick={() => {
                                  if (confirm(`Supprimer "${p.name}" définitivement ?\nSes images Cloudinary seront aussi supprimées.`)) {
                                    deleteProdMut.mutate(p.id);
                                  }
                                }}
                                disabled={deleteProdMut.isPending}
                                className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                🗑️ Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400">
                  {filteredProducts.length} produit(s) affiché(s) sur {allProducts.length} total
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
              TAB : CATÉGORIES
            ========================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button variant="primary" onClick={openCreateCategory} id="btn-add-category">
                + Nouvelle catégorie
              </Button>
            </div>

            {loadingCategories ? (
              <CategoryTableSkeleton />
            ) : categories.length === 0 ? (
              <div className="card p-16 text-center">
                <div className="text-5xl mb-4">🏷️</div>
                <p className="font-semibold text-agri-dark text-lg">Aucune catégorie</p>
                <p className="text-gray-400 mt-1 text-sm">Créez votre première catégorie pour organiser votre catalogue</p>
                <Button variant="primary" className="mt-4" onClick={openCreateCategory}>
                  + Créer une catégorie
                </Button>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="space-y-4 p-4 lg:hidden">
                  {categories.map((cat) => (
                    <div key={cat.id} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                          {cat.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cat.imageUrl}
                              alt={cat.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">🏷️</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-agri-dark">{cat.name}</div>
                          <div className="mt-1 inline-flex rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                            {cat.slug}
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            {cat.description || 'Aucune description'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center justify-center rounded-full bg-agri-green-50 px-3 py-2 text-sm font-bold text-agri-green-700">
                          {cat._count?.products ?? 0} produit(s)
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            id={`edit-category-mobile-${cat.id}`}
                            onClick={() => openEditCategory(cat)}
                            className="text-xs font-semibold text-agri-green-600 hover:bg-agri-green-50 px-3 py-2 rounded-xl transition-colors"
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            id={`delete-category-mobile-${cat.id}`}
                            onClick={() => {
                              const count = cat._count?.products ?? 0;
                              if (count > 0) {
                                toast.error(`Impossible : ${count} produit(s) utilisent cette catégorie. Réaffectez-les d'abord.`);
                                return;
                              }
                              if (confirm(`Supprimer la catégorie "${cat.name}" ?`)) {
                                deleteCatMut.mutate(cat.id);
                              }
                            }}
                            disabled={deleteCatMut.isPending}
                            className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="table-agri hidden lg:table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Nom</th>
                        <th>Slug URL</th>
                        <th>Description</th>
                        <th className="text-center">Produits</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat.id}>
                          <td>
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                              {cat.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={cat.imageUrl}
                                  alt={cat.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">
                                  🏷️
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="font-semibold text-agri-dark">{cat.name}</td>
                          <td>
                            <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                              {cat.slug}
                            </code>
                          </td>
                          <td className="text-gray-500 text-sm max-w-[200px] truncate">
                            {cat.description || <span className="italic text-gray-300">—</span>}
                          </td>
                          <td className="text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-agri-green-50 text-agri-green-700 text-sm font-bold">
                              {cat._count?.products ?? 0}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                id={`edit-category-${cat.id}`}
                                onClick={() => openEditCategory(cat)}
                                className="text-xs font-semibold text-agri-green-600 hover:bg-agri-green-50 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                ✏️ Modifier
                              </button>
                              <button
                                id={`delete-category-${cat.id}`}
                                onClick={() => {
                                  const count = cat._count?.products ?? 0;
                                  if (count > 0) {
                                    toast.error(`Impossible : ${count} produit(s) utilisent cette catégorie. Réaffectez-les d'abord.`);
                                    return;
                                  }
                                  if (confirm(`Supprimer la catégorie "${cat.name}" ?`)) {
                                    deleteCatMut.mutate(cat.id);
                                  }
                                }}
                                disabled={deleteCatMut.isPending}
                                className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                              >
                                🗑️ Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400">
                  {categories.length} catégorie(s) au total
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==========================================
            MODAL — PRODUIT (Créer / Modifier)
          ========================================== */}
      {productModal.open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setProductModal({ open: false, mode: 'create' }); }}
        >
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="p-8 pb-0 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-agri-dark">
                  {productModal.mode === 'create' ? 'Ajouter un produit' : `Modifier "${productModal.product?.name}"`}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {productModal.mode === 'create'
                    ? 'Les images seront uploadées sur Cloudinary automatiquement'
                    : 'Modifiez les informations — les nouvelles images seront ajoutées au Cloudinary'}
                </p>
              </div>
              <button
                onClick={() => setProductModal({ open: false, mode: 'create' })}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-8 space-y-5">
              {/* Nom */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nom du produit <span className="text-red-400">*</span>
                </label>
                <input
                  id="product-name"
                  className="input"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ex: Riz TCS 25 Livres"
                  required
                />
              </div>

              {/* Variantes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">
                      Variantes produit <span className="text-red-400">*</span>
                    </label>
                    <p className="text-xs text-gray-400 mt-1">
                      Exemple : 500 g, 1 livre, 25 livres. La premiere variante active sera la variante par defaut.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={addVariantRow}>
                    + Ajouter une variante
                  </Button>
                </div>

                <div className="space-y-3">
                  {productForm.variants.map((variant, index) => (
                    <div key={variant.id ?? `variant-${index}`} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-agri-dark">
                            Variante {index + 1}
                            {index === 0 && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-agri-green-100 text-agri-green-700">
                                Defaut
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariantRow(index)}
                          className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Retirer
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Libelle <span className="text-red-400">*</span>
                        </label>
                        <input
                          className="input"
                          value={variant.label}
                          onChange={(e) => updateVariantField(index, 'label', e.target.value)}
                          placeholder="Ex: 500 g, 1 livre, 25 livres"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Prix (HTG) <span className="text-red-400">*</span>
                          </label>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.price}
                            onChange={(e) => updateVariantField(index, 'price', e.target.value)}
                            placeholder="2500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Points Sur Commission <span className="text-red-400">*</span>
                          </label>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.vpPoints}
                            onChange={(e) => updateVariantField(index, 'vpPoints', e.target.value)}
                            placeholder="12.5"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Poids (Lbs) <span className="text-red-400">*</span>
                          </label>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.weightLbs}
                            onChange={(e) => updateVariantField(index, 'weightLbs', e.target.value)}
                            placeholder="1"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Stock <span className="text-red-400">*</span>
                          </label>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="1"
                            value={variant.stockQuantity}
                            onChange={(e) => updateVariantField(index, 'stockQuantity', e.target.value)}
                            placeholder="100"
                            required
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-agri-gold-300/40 bg-agri-gold-300/10 p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h4 className="text-sm font-semibold text-agri-dark">Prix variable par quantité</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              Optionnel. Le prix de base ci-dessus s’applique tant qu’aucun palier ne correspond.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addPricingTierRow(index)}
                            className="text-xs font-semibold text-agri-green-700 hover:bg-white px-3 py-2 rounded-xl transition-colors"
                          >
                            + Ajouter un palier
                          </button>
                        </div>

                        {variant.pricingTiers.length > 0 ? (
                          <div className="space-y-3">
                            <div className="hidden sm:grid sm:grid-cols-[0.9fr_0.9fr_1fr_auto] gap-3 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                              <span>Quantité min</span>
                              <span>Quantité max</span>
                              <span>Prix unitaire</span>
                              <span />
                            </div>
                            {variant.pricingTiers.map((tier, tierIndex) => (
                              <div
                                key={`${variant.id || index}-tier-${tierIndex}`}
                                className="grid grid-cols-1 sm:grid-cols-[0.9fr_0.9fr_1fr_auto] gap-3 rounded-2xl border border-white/70 bg-white p-3"
                              >
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1 sm:hidden">Quantité min</label>
                                  <input
                                    className="input"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={tier.minQuantity}
                                    onChange={(e) => updatePricingTierField(index, tierIndex, 'minQuantity', e.target.value)}
                                    placeholder="5"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1 sm:hidden">Quantité max</label>
                                  <input
                                    className="input"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={tier.maxQuantity}
                                    onChange={(e) => updatePricingTierField(index, tierIndex, 'maxQuantity', e.target.value)}
                                    placeholder="9 ou vide"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1 sm:hidden">Prix unitaire</label>
                                  <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={tier.price}
                                    onChange={(e) => updatePricingTierField(index, tierIndex, 'price', e.target.value)}
                                    placeholder="450"
                                  />
                                </div>
                                <div className="flex sm:items-center">
                                  <button
                                    type="button"
                                    onClick={() => removePricingTierRow(index, tierIndex)}
                                    className="w-full sm:w-auto text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
                                  >
                                    Retirer
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-white/90 bg-white/70 px-4 py-4 text-sm text-gray-500">
                            Aucun palier configuré. Le produit gardera un prix fixe pour cette variante.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catégorie + Statut */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Catégorie <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="product-category"
                    className="input"
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">
                      ⚠️ Créez d'abord une catégorie dans l'onglet Catégories
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Statut</label>
                  <div className="flex gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={productForm.isActive}
                        onChange={() => setProductForm({ ...productForm, isActive: true })}
                        className="accent-agri-green-600"
                      />
                      <span className="text-sm font-medium text-green-700">Actif</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={!productForm.isActive}
                        onChange={() => setProductForm({ ...productForm, isActive: false })}
                        className="accent-red-500"
                      />
                      <span className="text-sm font-medium text-red-600">Inactif</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="product-description"
                  className="input h-28 resize-none"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Description détaillée du produit, provenance, qualité..."
                  required
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {productModal.mode === 'create' ? (
                    <>Images produit <span className="text-red-400">*</span></>
                  ) : (
                    'Ajouter de nouvelles images'
                  )}
                </label>

                {/* Images existantes en mode édition */}
                {productModal.mode === 'edit' && productModal.product?.images && productModal.product.images.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Images actuelles. Cliquez sur une image pour la prévisualiser avant suppression.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {productModal.product.images.map((img) => (
                        <div key={img.id} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: img.url, isPrimary: img.isPrimary })}
                            className="block w-full h-full"
                            aria-label="Prévisualiser l'image"
                          >
                            <img src={img.url} alt="product" className="w-full h-full object-cover" />
                          </button>
                          {img.isPrimary && (
                            <span className="absolute top-0.5 left-0.5 text-xs bg-agri-gold-400 text-white px-1 rounded font-bold">★</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Supprimer cette image définitivement de Cloudinary ?')) {
                                deleteImgMut.mutate({
                                  productId: productModal.product!.id,
                                  imageId: img.id,
                                });
                              }
                            }}
                            className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white text-xs hidden group-hover:flex items-center justify-center"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <ImageDropzone files={productFiles} onChange={setProductFiles} label="images produit" multiple />

                {isUploadingImages && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-agri-green-600">
                    <div className="w-4 h-4 border-2 border-agri-green-600 border-t-transparent rounded-full animate-spin" />
                    Upload en cours sur Cloudinary...
                  </div>
                )}
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="flex-1"
                  onClick={() => setProductModal({ open: false, mode: 'create' })}
                >
                  Annuler
                </Button>
                <Button
                  id="submit-product"
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isProdPending}
                  className="flex-1"
                >
                  {isUploadingImages
                    ? 'Upload images...'
                    : productModal.mode === 'create'
                    ? '✅ Créer le produit'
                    : '✅ Sauvegarder les modifications'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
            MODAL — CATÉGORIE (Créer / Modifier)
          ========================================== */}
      {categoryModal.open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCategoryModal({ open: false, mode: 'create' }); }}
        >
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="p-8 pb-0 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-agri-dark">
                  {categoryModal.mode === 'create' ? 'Nouvelle catégorie' : `Modifier "${categoryModal.category?.name}"`}
                </h2>
                <p className="text-sm text-gray-400 mt-1">Le slug URL est généré automatiquement</p>
              </div>
              <button
                onClick={() => setCategoryModal({ open: false, mode: 'create' })}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="p-8 space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nom de la catégorie <span className="text-red-400">*</span>
                </label>
                <input
                  id="category-name"
                  className="input"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Ex: Riz, Épices, Légumineuses..."
                  required
                />
              </div>

              {/* Slug preview */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Slug (auto-généré)</label>
                <div className="input bg-gray-50 text-gray-400 text-sm">
                  {categoryForm.name
                    ? categoryForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    : 'votre-categorie'}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description (optionnel)</label>
                <textarea
                  id="category-description"
                  className="input h-24 resize-none"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Description de la catégorie..."
                />
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Image de catégorie (optionnel)
                </label>

                {/* Image actuelle en mode édition */}
                {categoryModal.mode === 'edit' && categoryModal.category?.imageUrl && categoryFile.length === 0 && (
                  <div className="mb-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={categoryModal.category.imageUrl}
                      alt="current"
                      className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                    />
                    <p className="text-xs text-gray-500">Image actuelle. Uploadez une nouvelle pour la remplacer.</p>
                  </div>
                )}

                <ImageDropzone
                  files={categoryFile}
                  onChange={setCategoryFile}
                  label="image de catégorie"
                  multiple={false}
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="flex-1"
                  onClick={() => setCategoryModal({ open: false, mode: 'create' })}
                >
                  Annuler
                </Button>
                <Button
                  id="submit-category"
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isCatPending}
                  className="flex-1"
                >
                  {categoryModal.mode === 'create' ? '✅ Créer' : '✅ Mettre à jour'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewImage(null);
          }}
        >
          <div className="relative w-full max-w-3xl rounded-3xl bg-white overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/70 text-white hover:bg-black/80 transition-colors"
              aria-label="Fermer la prévisualisation"
            >
              ✕
            </button>
            <div className="relative bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.16),_transparent_35%),linear-gradient(135deg,_#ffffff_0%,_#f6f8ef_100%)] p-6 md:p-8">
              {previewImage.isPrimary && (
                <div className="inline-flex items-center gap-2 rounded-full bg-agri-gold-300/20 border border-agri-gold-300/50 text-agri-gold-700 text-xs font-semibold px-3 py-1 mb-4">
                  ★ Image principale
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt="Prévisualisation du produit"
                className="w-full max-h-[72vh] object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SKELETON LOADERS
// ==========================================

function ProductTableSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-agri">
          <thead>
            <tr>
              <th>Produit</th><th>Catégorie</th><th>Prix</th><th>PSK</th>
              <th>Poids</th><th>Stock</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {[...Array(8)].map((__, j) => (
                  <td key={j}>
                    <div className="shimmer h-4 rounded-lg" style={{ width: j === 0 ? '150px' : '80px' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryTableSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-agri">
          <thead>
            <tr><th>Image</th><th>Nom</th><th>Slug</th><th>Description</th><th>Produits</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {[...Array(4)].map((_, i) => (
              <tr key={i}>
                {[...Array(6)].map((__, j) => (
                  <td key={j}>
                    <div className="shimmer h-4 rounded-lg" style={{ width: j === 0 ? '48px' : '100px', height: j === 0 ? '48px' : '16px' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
