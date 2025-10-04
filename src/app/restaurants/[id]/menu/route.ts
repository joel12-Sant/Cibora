import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  try {
    const tenantId = params.id;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const menu = await prisma.menu.findFirst({
      where: { tenantId },
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
