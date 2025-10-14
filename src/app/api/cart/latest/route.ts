import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cartResponseSchema } from "@/lib/cart-types";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    const safe = cartResponseSchema.parse({ items: [] });
    return NextResponse.json(safe, { status: 200 });
  }

  const cart = await prisma.cart.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });

  const payload = {
    items: cart?.items.map(ci => ({
      menuItemId: ci.menuItemId,
      name: ci.name,
      price: ci.price,
      qty: ci.qty,
    })) ?? [],
    tenantId: cart?.tenantId ?? null,
  };

  const safe = cartResponseSchema.parse({ items: payload.items });
  return NextResponse.json({ ...safe, tenantId: payload.tenantId }, { status: 200 });
}
