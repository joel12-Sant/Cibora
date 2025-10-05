import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const BodySchema = z.object({
  userId: z.string().uuid().optional(), // opcional hasta tener auth completa
  items: z.array(
    z.object({
      id: z.string().uuid(), // MenuItem.id
      qty: z.number().int().min(1),
    })
  ).min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { userId, items } = parsed.data;

    // 1) Traer items y su tenant
    const ids = items.map((i) => i.id);
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true,
        active: true,
        menu: { select: { tenantId: true } },
      },
    });

    // Validaciones básicas
    if (dbItems.length !== items.length) {
      return NextResponse.json({ error: "Some items not found" }, { status: 400 });
    }
    if (dbItems.some((i) => !i.active)) {
      return NextResponse.json({ error: "Some items are inactive" }, { status: 400 });
    }

    // 2) Todos los items deben pertenecer al mismo tenant
    const tenantIds = Array.from(new Set(dbItems.map((i) => i.menu.tenantId)));
    if (tenantIds.length !== 1) {
      return NextResponse.json({ error: "Items belong to different tenants" }, { status: 400 });
    }
    const tenantId = tenantIds[0];

    // 3) Calcular total
    const map = new Map(dbItems.map((i) => [i.id, i]));
    const total = items.reduce((acc, it) => acc + map.get(it.id)!.price * it.qty, 0);

    // 4) Crear Order + OrderItems
    const resolvedUserId = userId ?? (await ensureGuestUser());
    const order = await prisma.order.create({
      data: {
        tenantId,
        userId: resolvedUserId,
        status: "CREATED",
        total,
        items: {
          create: items.map((it) => {
            const ref = map.get(it.id)!;
            return {
              itemId: ref.id,
              name: ref.name,
              price: ref.price,
              qty: it.qty,
            };
          }),
        },
      },
      select: { id: true, status: true, total: true },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Usuario “invitado” temporal (hasta tener Auth completa)
async function ensureGuestUser(): Promise<string> {
  const email = "guest@cibora.local";
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: { email, role: "CUSTOMER" },
    select: { id: true },
  });
  return created.id;
}
