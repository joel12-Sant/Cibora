import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Role, OrderStatus} from "@prisma/client";
import ItemsTable from "@/app/orders/history/merchant/ItemsTable";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user ?? null;
  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>No autorizado.</p>
        <Link className="underline" href="/">Volver</Link>
      </main>
    );
  }

  const counts = await prisma.order.groupBy({
    by: ["status"],
    where: { tenantId: user.tenantId },
    _count: { _all: true },
  });
  const countByStatus = new Map<OrderStatus, number>(
    Object.values(OrderStatus).map((s) => [s, 0]),
  );
  for (const row of counts) countByStatus.set(row.status, row._count._all);

  const [items] = await Promise.all([
    prisma.menuItem.findMany({
      where: { menu: { tenantId: user.tenantId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, active: true },
    }),
  ]);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Panel del restaurante</h1>
      
          <section>
                <div className="flex items-center justify-between p-4">
                    <h2 className="mb-2 font-medium">Menú</h2>
                    <Link
                        href="/dashboard/menu"
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                        Gestionar menú
                    </Link>
                </div>
                <ItemsTable items={items} />
          </section>
      
    </main>
  );
}

