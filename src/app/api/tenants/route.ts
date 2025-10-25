import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { Role } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  address: z.object({
    line1: z.string().min(3),
    city: z.string().min(2),
    state: z.string().optional(),
    postalCode: z.string().min(3),
    country: z.string().min(2),
  }),
});

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as { id: string; role: Role } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "MERCHANT_OWNER") return NextResponse.json({ error: "Debe ser dueño" }, { status: 403 });

  const json = await req.json().catch(()=>null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, description, imageUrl, address } = parsed.data;

  const tenant = await prisma.tenant.create({
    data: {
      name,
      status: "APPROVED",
      description,
      imageUrl,
      addresses: {
        create: {
          label: "Sucursal",
          line1: address.line1,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          isPrimary: true,
        },
      },
    },
    select: { id: true },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { tenantId: tenant.id },
  });

  return NextResponse.json({ ok: true, tenantId: tenant.id });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ tenants: [] });

  const tenants = await prisma.tenant.findMany({
    where: { name: { contains: query, mode: "insensitive" } },
    select: { id: true, name: true },
    take: 10,
  });

  return NextResponse.json({ tenants });
}
