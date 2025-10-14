import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

type SessionUser = { id: string; role: Role; tenantId: string | null };

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  const user = (session?.user as SessionUser) ?? null;

  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF]);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const item = await prisma.menuItem.findFirst({
    where: { id, menu: { tenantId: user.tenantId } },
    select: { id: true, active: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.menuItem.update({
    where: { id },
    data: { active: !item.active },
    select: { id: true, active: true },
  });

  return NextResponse.json({ item: updated });
}
