// src/lib/cart-types.ts
import { z } from "zod";


export const upsertItemSchema = z.object({
  tenantId: z.string().min(1, "tenantId requerido"),
  item: z.object({
    menuItemId: z.string().min(1, "menuItemId requerido"),
    qty: z.number().int().positive("qty debe ser > 0"),
  }),
});

export const setQtySchema = z.object({
  tenantId: z.string().min(1, "tenantId requerido"),
  menuItemId: z.string().min(1, "menuItemId requerido"),
  qty: z.number().int().min(0, "qty no puede ser negativo"),
});

export const removeItemSchema = z.object({
  tenantId: z.string().min(1, "tenantId requerido"),
  menuItemId: z.string().min(1, "menuItemId requerido"),
});

export const mergeSchema = z.object({
  tenantId: z.string().min(1, "tenantId requerido"),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, "menuItemId requerido"),
        qty: z.number().int().positive("qty debe ser > 0"),
      })
    )
    .min(1, "Debes incluir al menos 1 ítem"),
});

/** Tipos inferidos (útiles para handlers y componentes) */
export type UpsertItemInput = z.infer<typeof upsertItemSchema>;
export type SetQtyInput = z.infer<typeof setQtySchema>;
export type RemoveItemInput = z.infer<typeof removeItemSchema>;
export type MergeInput = z.infer<typeof mergeSchema>;

/** Respuesta estándar del carrito */
export const cartResponseSchema = z.object({
  items: z.array(
    z.object({
      menuItemId: z.string(),
      name: z.string(),
      price: z.number().int(),
      qty: z.number().int(),
    })
  ),
});
export type CartResponse = z.infer<typeof cartResponseSchema>;
