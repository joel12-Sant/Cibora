// TODO: migrar cuando Next permita sync params
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> }; // ⬅️ Promise

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;         // ⬅️ await aquí
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!tenant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

    const menu = await prisma.menu.findFirst({
      where: { tenantId: id },
      select: {
        id: true,
        name: true,
        items: { select: { id: true, name: true, price: true, active: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: menu ?? null });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
