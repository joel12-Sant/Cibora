// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(), // hasta integrar Auth
  items: z.array(
    z.object({
      id: z.string().uuid(), // MenuItem.id
      qty: z.number().int().min(1),
    })
  ).min(1),
});

// util: combina líneas duplicadas (mismo item)
function mergeItems(items: Array<{ id: string; qty: number }>) {
  const map = new Map<string, number>();
  for (const it of items) map.set(it.id, (map.get(it.id) ?? 0) + it.qty);
  return Array.from(map, ([id, qty]) => ({ id, qty }));
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { tenantId, userId } = parsed.data;
    const items = mergeItems(parsed.data.items);

    // 1) Validar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Invalid tenant" }, { status: 400 });
    }

    // 2) Traer items del menú (siempre desde BD, no confiar en el cliente)
    const ids = items.map((i) => i.id);
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: ids }, menu: { tenantId } },
      select: { id: true, name: true, price: true, active: true },
    });

    if (dbItems.length !== items.length) {
      return NextResponse.json({ error: "Some items not found for this tenant" }, { status: 400 });
    }
    if (dbItems.some((i) => !i.active)) {
      return NextResponse.json({ error: "Some items are inactive" }, { status: 400 });
    }

    // 3) Calcular total (con precios de BD)
    const ref = new Map(dbItems.map((i) => [i.id, i]));
    const total = items.reduce((acc, it) => acc + ref.get(it.id)!.price * it.qty, 0);
    if (total <= 0) {
      return NextResponse.json({ error: "Order total must be > 0" }, { status: 400 });
    }

    // 4) Resolver usuario (invitado hasta tener Auth)
    const resolvedUserId = userId ?? (await ensureGuestUser());

    // 5) Crear Order + OrderItems (nested write = transaccional)
    const order = await prisma.order.create({
      data: {
        tenantId,
        userId: resolvedUserId,
        status: "CREATED", // enum OrderStatus debe incluir CREATED
        total,
        items: {
          create: items.map((it) => {
            const mi = ref.get(it.id)!;
            return {
              itemId: mi.id,
              name: mi.name,
              price: mi.price,
              qty: it.qty,
            };
          }),
        },
      },
      select: { id: true },
    });

    // 6) Responder minimal e idempotente-friendly
    return NextResponse.json({ orderId: order.id }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[orders] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Usuario “invitado” temporal (hasta Auth)
async function ensureGuestUser(): Promise<string> {
  const email = "guest@cibora.local";
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: { email, role: "CUSTOMER" }, // passwordHash null permitido
    select: { id: true },
  });
  return created.id;
}
