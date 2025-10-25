import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const TenantSchema = z.object({
  name: z.string().trim().min(2, "El nombre del restaurante debe tener al menos 2 caracteres"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
  imageUrl: z.string().trim().url("URL inválida").max(2048).optional(),
});

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Tu nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["CUSTOMER", "COURIER", "MERCHANT_OWNER", "MERCHANT_STAFF"]),
  // Para dueño, si llega este bloque, se intentará crear el tenant en el registro
  tenant: TenantSchema.optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = RegisterSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, email, password, role, tenant } = parsed.data;

    // ¿existe correo?
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "Ese correo ya está registrado" }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: await bcrypt.hash(password, 10),
          role,
        },
        select: { id: true },
      });

      let tenantId: string | null = null;

      // Si viene como dueño y mandó datos de restaurante, lo creamos ya
      if (role === "MERCHANT_OWNER" && tenant?.name) {
        const t = await tx.tenant.create({
          data: {
            name: tenant.name,
            description: tenant.description ?? null,
            imageUrl: tenant.imageUrl ?? null,
          },
          select: { id: true },
        });
        tenantId = t.id;

        await tx.user.update({
          where: { id: user.id },
          data: { tenantId },
        });
      }

      return { tenantId };
    });

    return NextResponse.json({ ok: true, tenantId: result.tenantId }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/auth/register] error:", err);
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 400 });
  }
}
