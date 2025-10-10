// src/app/api/cart/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cartResponseSchema } from "@/lib/cart-types";

/**
 * Devuelve el carrito ACTIVO del usuario para un tenant específico.
 * - Si no hay sesión: responde { items: [] } (200) para no romper la UI.
 * - Requiere query param: ?tenantId=...
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId requerido" }, { status: 400 });
  }

  // Si no hay sesión, devolvemos un carrito vacío (UX: UI puede hidratar con local)
  if (!userId) {
    const empty = { items: [] as Array<{ menuItemId: string; name: string; price: number; qty: number }> };
    // Validamos salida para asegurar shape estable (ayuda a no romper clientes)
    const safe = cartResponseSchema.parse(empty);
    return NextResponse.json(safe, { status: 200 });
  }

  const cart = await prisma.cart.findFirst({
    where: { userId, tenantId, status: "ACTIVE" },
    include: { items: true },
  });

  const payload = {
    items:
      cart?.items.map((ci) => ({
        menuItemId: ci.menuItemId,
        name: ci.name,
        price: ci.price,
        qty: ci.qty,
      })) ?? [],
  };

  const safe = cartResponseSchema.parse(payload);
  return NextResponse.json(safe, { status: 200 });
}
