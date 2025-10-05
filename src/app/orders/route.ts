import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const BodySchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(), // MenuItem.id
      qty: z.number().int().min(1),
    })
  ).min(1),
});

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: unknown };

type OrderItemInput = { id: string; qty: number };
type DbItem = { id: string; name: string; price: number; active: boolean; menu: { tenantId: string } };

export async function POST(req: Request) {
  try {
    const json = (await req.json()) as unknown;
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json<ApiErr>(
        { ok: false, error: parsed.error.format() },
        { status: 400 }
      );
    }

    const items: OrderItemInput[] = parsed.data.items;

    // 1) Traer items + tenant
    const ids = items.map((i) => i.id);
    const dbItems: DbItem[] = await prisma.menuItem.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true,
        active: true,
        menu: { select: { tenantId: true } },
      },
    });

    if (dbItems.length !== items.length) {
      return NextResponse.json<ApiErr>(
        { ok: false, error: "Some items not found" },
        { status: 400 }
      );
    }
    if (dbItems.some((i) => !i.active)) {
      return NextResponse.json<ApiErr>(
        { ok: false, error: "Some items are inactive" },
        { status: 400 }
      );
    }

    // 2) Todos del mismo tenant
    const tenantIds = Array.from(new Set(dbItems.map((i) => i.menu.tenantId)));
    if (tenantIds.length !== 1) {
      return NextResponse.json<ApiErr>(
        { ok: false, error: "Items belong to different tenants" },
        { status: 400 }
      );
    }
    const tenantId = tenantIds[0];

    // 3) Calcular total
    const map = new Map<string, DbItem>(dbItems.map((i) => [i.id, i]));
    const total = items.reduce((acc, it) => acc + map.get(it.id)!.price * it.qty, 0);

    // 4) Resolver userId desde la sesión (email -> id) o guest
    const session = await getServerSession(authOptions);
    const email: string | null = session?.user?.email ?? null;

    let userId: string | null = null;
    if (email) {
      const u = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      userId = u?.id ?? null;
    }
    if (!userId) userId = await ensureGuestUser();

    // 5) Crear orden
    const order = await prisma.order.create({
      data: {
        tenantId,
        userId,
        status: "CREATED",
        total,
        items: {
          create: items.map((it) => {
            const ref = map.get(it.id)!;
            return { itemId: ref.id, name: ref.name, price: ref.price, qty: it.qty };
          }),
        },
      },
      select: { id: true, status: true, total: true },
    });

    return NextResponse.json<ApiOk<typeof order>>({ ok: true, data: order }, { status: 201 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json<ApiErr>({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

// Usuario invitado
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
