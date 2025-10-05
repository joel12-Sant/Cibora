import { auth } from "@/lib/auth"; // o getServerSession si tienes helper
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function OrdersHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    // redirige a signin con callback
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="mb-4">Necesitas iniciar sesión para ver tus pedidos.</p>
        <Link className="underline" href="/auth/signin?callbackUrl=/orders/history">
          Iniciar sesión
        </Link>
      </main>
    );
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, status: true, total: true, createdAt: true,
      tenant: { select: { name: true } },
      _count: { select: { items: true } },
    },
    take: 20,
  });

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Mis pedidos</h1>
      {orders.length === 0 ? (
        <p className="opacity-70">Aún no tienes pedidos.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {orders.map(o => (
            <li key={o.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{o.tenant.name}</p>
                <p className="text-sm opacity-70">
                  #{o.id.slice(0,8)} • {o._count.items} ítems • ${o.total} MXN
                </p>
              </div>
              <Link className="text-sm underline" href={`/orders/${o.id}/confirmation`}>
                Ver
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
