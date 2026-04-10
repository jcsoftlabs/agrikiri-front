import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CartItem {
  key: string;
  productId: string;
  productSlug: string;
  productName: string;
  imageUrl?: string;
  variantId?: string;
  variantLabel?: string;
  unitPrice: number;
  vpPoints: number;
  weightLbs: number;
  quantity: number;
  maxStock: number;
}

interface AddCartItemInput extends Omit<CartItem, 'key'> {}

interface CartState {
  items: CartItem[];
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  addItem: (item: AddCartItemInput) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

const getCartItemKey = (productId: string, variantId?: string) =>
  variantId ? `${productId}:${variantId}` : productId;

const clampQuantity = (quantity: number, maxStock: number) =>
  Math.max(1, Math.min(quantity, Math.max(1, maxStock)));

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      addItem: (item) =>
        set((state) => {
          const key = getCartItemKey(item.productId, item.variantId);
          const maxStock = Math.max(0, item.maxStock);

          if (maxStock < 1) {
            return state;
          }

          const existingItem = state.items.find((cartItem) => cartItem.key === key);

          if (existingItem) {
            return {
              items: state.items.map((cartItem) =>
                cartItem.key === key
                  ? {
                      ...cartItem,
                      imageUrl: item.imageUrl,
                      variantLabel: item.variantLabel,
                      unitPrice: item.unitPrice,
                      vpPoints: item.vpPoints,
                      weightLbs: item.weightLbs,
                      maxStock,
                      quantity: clampQuantity(cartItem.quantity + item.quantity, maxStock),
                    }
                  : cartItem
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...item,
                key,
                quantity: clampQuantity(item.quantity, maxStock),
                maxStock,
              },
            ],
          };
        }),
      updateQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.key === key
                ? {
                    ...item,
                    quantity: clampQuantity(quantity, item.maxStock),
                  }
                : item
            )
            .filter((item) => item.quantity > 0),
        })),
      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((item) => item.key !== key),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'agrikiri_cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
