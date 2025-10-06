export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
// app/api/restaurants/[id]/menu/route.ts

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // id = Tenant/Restaurant id
  
  const menu = await prisma.menu.findFirst({
    where: { tenantId: id },
    select: { id: true },
  });

  if (!menu) return NextResponse.json({ items: [] });

  const items = await prisma.menuItem.findMany({
    where: { menuId: menu.id },
    select: { id: true, name: true, price: true, active: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ items });
}
