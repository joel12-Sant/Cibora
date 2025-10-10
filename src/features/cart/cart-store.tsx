// src/features/cart/cart-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  name: string;
  price: number; // pesos enteros (e.g., 120 = $120.00)
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const idx = get().items.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          const copy = get().items.slice();
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + item.qty };
          set({ items: copy });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      remove: (id) => set({ items: get().items.filter((x) => x.id !== id) }),
      setQty: (id, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((x) => x.id !== id) });
          return;
        }
        const copy = get().items.slice();
        const idx = copy.findIndex((x) => x.id === id);
        if (idx >= 0) {
          copy[idx] = { ...copy[idx], qty };
          set({ items: copy });
        }
      },
      clear: () => set({ items: [] }),
    }),
    { name: "cibora-cart" } // localStorage key
  )
);
