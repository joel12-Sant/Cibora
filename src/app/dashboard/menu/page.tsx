// src/app/dashboard/menu/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import NewItemModal from "./NewItemModal";
import ItemsTable from "../ItemsTable";

export default async function MenuPage() {
  const session = await auth();
  const user = session?.user as { role?: Role; tenantId?: string | null } | null;

  const allowed = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);
  if (!user || !user.tenantId || !user.role || !allowed.has(user.role)) {
    redirect("/dashboard"); // o a login, según tu UX
  }

  const menu = await prisma.menu.findFirst({
    where: { tenantId: user.tenantId },
    select: { id: true },
  });

  const items = await prisma.menuItem.findMany({
    where: { menuId: menu?.id ?? "" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true, active: true, imageUrl: true, description: true },
  });

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Menú</h1>
        <NewItemModal />
      </div>
      
      <ItemsTable items={items} />
    </div>
  );
}
