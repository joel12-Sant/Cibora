import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const detectSchema = z.object({
  items: z
    .array(z.object({ menuItemId: z.string().min(1) }))
    .min(1, "Se requiere al menos un item"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = detectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const ids = parsed.data.items.map((i) => i.menuItemId);

  const items = await prisma.menuItem.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true, menu: { select: { tenantId: true } } },
  });

  if (items.length !== ids.length) {
    return NextResponse.json({ error: "items_not_found_or_inactive" }, { status: 400 });
  }

  const tenants = new Set(items.map((i) => i.menu.tenantId));
  if (tenants.size !== 1) {
    return NextResponse.json({ error: "items_from_different_tenants" }, { status: 400 });
  }

  const tenantId = items[0]?.menu.tenantId;
  return NextResponse.json({ tenantId }, { status: 200 });
}
