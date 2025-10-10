import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cartResponseSchema } from "@/lib/cart-types";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    // sin sesión → carrito vacío (no rompemos la UI)
    const safe = cartResponseSchema.parse({ items: [] });
    return NextResponse.json(safe, { status: 200 });
  }

  // último carrito ACTIVO más reciente (si hubiera varios tenants)
  const cart = await prisma.cart.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });

  const payload = {
    // si existe, lo devolvemos; si no, vacío
    items: cart?.items.map(ci => ({
      menuItemId: ci.menuItemId,
      name: ci.name,
      price: ci.price,
      qty: ci.qty,
    })) ?? [],
    // enviamos el tenantId para que el cliente pueda cachearlo
    tenantId: cart?.tenantId ?? null,
  };

  // validamos solo la parte de items con el schema existente
  const safe = cartResponseSchema.parse({ items: payload.items });
  return NextResponse.json({ ...safe, tenantId: payload.tenantId }, { status: 200 });
}
