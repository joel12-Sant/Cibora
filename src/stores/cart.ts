import { create } from "zustand";

export type CartItem = {
  id: string;
  name: string;
  price: number; // en pesos
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  add: (item) =>
    set((s) => {
      const idx = s.items.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        const copy = s.items.slice();
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + item.qty };
        return { items: copy };
      }
      return { items: [...s.items, item] };
    }),
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  clear: () => set({ items: [] }),
}));
