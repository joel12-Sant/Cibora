import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

const ALLOWED = new Set<Role>(["MERCHANT_OWNER", "MERCHANT_STAFF", "ADMIN"] as const);

const createItemSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120, "Máximo 120 caracteres"),
  price: z.number().int("Debe ser entero").nonnegative("Precio inválido"),
  active: z.boolean().optional(),
  imageUrl: z.string().trim().url("URL inválida").max(2048).optional(),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

function fieldError(details: Record<string, string[]> = {}) {
  return { details: { fieldErrors: details } };
}

export async function POST(req: Request, { params }: { params: { menuId: string } }) {
  const session = await auth();
  const user = session?.user ?? null;

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!user.tenantId || !ALLOWED.has(user.role as Role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Checar ownership del menú
  const menu = await prisma.menu.findFirst({
    where: { id: params.menuId, tenantId: user.tenantId },
    select: { id: true },
  });
  if (!menu) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });

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
      {
        error: "Validación fallida",
        ...fieldError({
          name: f.name ?? [],
          price: f.price ?? [],
          imageUrl: f.imageUrl ?? [],
          description: f.description ?? [],
        }),
      },
      { status: 400 }
    );
  }

  try {
    const item = await prisma.menuItem.create({
      data: {
        menuId: params.menuId,
        name: parsed.data.name,
        price: parsed.data.price,
        active: parsed.data.active ?? true,
        imageUrl: parsed.data.imageUrl,
        description: parsed.data.description,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: item.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear el ítem" }, { status: 500 });
  }
}
