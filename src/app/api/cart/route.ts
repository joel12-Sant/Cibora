import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cartResponseSchema } from "@/lib/cart-types";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId requerido" }, { status: 400 });
  }

  if (!userId) {
    const empty = { items: [] as Array<{ menuItemId: string; name: string; price: number; qty: number }> };
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
