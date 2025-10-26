import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

const ALLOWED = new Set<Role>(["MERCHANT_OWNER", "MERCHANT_STAFF", "ADMIN"] as const);

const createItemSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120, "Máximo 120 caracteres"),
  price: z.coerce.number().int("Debe ser entero").nonnegative("Precio inválido"),
  active: z.boolean().optional(),
  imageUrl: z
    .string()
    .trim()
    .url("URL inválida")
    .max(2048)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  description: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

function fieldError(details: Record<string, string[]> = {}) {
  return { details: { fieldErrors: details } };
}

async function assertOwnership(tenantId: string, menuId: string): Promise<boolean> {
  const exists = await prisma.menu.findFirst({
    where: { id: menuId, tenantId },
    select: { id: true },
  });
  return Boolean(exists);
}

/** Crear ítem en un menú */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ menuId: string }> }
) {
  const { menuId } = await ctx.params;

  const session = await auth();
  const user = session?.user ?? null;

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!(await assertOwnership(user.tenantId, menuId))) {
    return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Validación fallida", ...fieldError({
        name: f.name ?? [],
        price: f.price ?? [],
        imageUrl: f.imageUrl ?? [],
        description: f.description ?? [],
      }) },
      { status: 400 }
    );
  }

  const { name, price, active, imageUrl, description } = parsed.data;

  try {
    const created = await prisma.menuItem.create({
      data: {
        menuId,
        name,
        price,
        active: active ?? true,
        imageUrl,
        description,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear el ítem" }, { status: 500 });
  }
}

/** (Opcional) Listar ítems del menú */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ menuId: string }> }
) {
  const { menuId } = await ctx.params;

  const session = await auth();
  const user = session?.user ?? null;

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!(await assertOwnership(user.tenantId, menuId))) {
    return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
  }

  try {
    const items = await prisma.menuItem.findMany({
      where: { menuId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, active: true, imageUrl: true, description: true },
    });
    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "No se pudieron obtener los ítems" }, { status: 500 });
  }
}
