import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const BodySchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(), // aún no hay auth; podemos usar invitado
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

    const { tenantId, userId, items } = parsed.data;

    // 1) Validar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Invalid tenant" }, { status: 400 });
    }

    // 2) Traer los items del menú y validar existencia/activo para ese tenant
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

// Usuario “invitado” temporal para el slice (hasta tener Auth)
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
