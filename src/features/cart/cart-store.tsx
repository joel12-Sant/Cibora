"use client";
import { create } from "zustand";

export type CartItem = {
  id: string;      // MenuItem.id
  name: string;
  price: number;   // MXN (enteros)
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  total: () => number;
};

export const useCart = create<CartState>((set, get) => ({
  items: [],
  add: (item, qty = 1) =>
    set((state) => {
      const idx = state.items.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const copy = [...state.items];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return { items: copy };
      }
      return { items: [...state.items, { ...item, qty }] };
    }),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  setQty: (id, qty) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, qty } : i)) })),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((acc, i) => acc + i.price * i.qty, 0),
}));
