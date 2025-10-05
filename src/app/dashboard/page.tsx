import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Role } from "@prisma/client";
import ItemsTable from "@/app/dashboard/ItemsTable"; // Componente client-side


export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as { id: string; role: Role; tenantId: string | null } | null;

  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF]);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>No autorizado.</p>
        <Link className="underline" href="/">Volver</Link>
      </main>
    );
  }

  const [orders, items] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, status: true, total: true, createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.menuItem.findMany({
      where: { menu: { tenantId: user.tenantId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, active: true },
    })
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Panel del restaurante</h1>

      <section>
        <h2 className="mb-2 font-medium">Pedidos recientes</h2>
        <ul className="divide-y rounded-xl border">
          {orders.map(o => (
            <li key={o.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium">#{o.id.slice(0,8)} • {o._count.items} ítems</p>
                <p className="text-sm opacity-70">{o.status} • ${o.total} MXN</p>
              </div>
              <Link className="text-sm underline" href={`/orders/${o.id}/confirmation`}>
                Ver
              </Link>
            </li>
          ))}
          {orders.length === 0 && <li className="p-3 opacity-70">Sin pedidos aún.</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Menú</h2>
        {/* Aquí agregaremos el toggle client-side */}
        <ItemsTable items={items} />
      </section>
    </main>
  );
}
