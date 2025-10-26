import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import MenuItemsManager from "./MenuItemsManager";

export default async function ManageMenuPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;

  const session = await auth();
  const user = session?.user ?? null;
  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);
  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
        <section className="mx-auto w-full max-w-md px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">No autorizado</h1>
            <div className="mt-4">
              <Link href="/dashboard" className="text-zinc-700 underline underline-offset-2 hover:text-orange-700">
                Volver
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // 👇 SIEMPRE filtra por id + tenantId
  const menu = await prisma.menu.findFirst({
    where: { id: menuId, tenantId: user.tenantId },
    select: {
      id: true,
      name: true,
      items: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, price: true, active: true, imageUrl: true, description: true },
      },
    },
  });

  if (!menu) return notFound();

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-5 sm:p-6 md:p-8">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Gestionar menú</h1>
              <p className="mt-1 text-sm text-zinc-600 truncate">{menu.name}</p>
            </div>
            <Link
              href="/dashboard"
              className="text-zinc-700 underline underline-offset-2 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md px-2 py-1"
            >
              Volver al panel
            </Link>
          </header>

          <div className="mt-6">
            {/* 👇 fuerza remount por si cambias entre menús sin recargar */}
            <MenuItemsManager key={menu.id} initialMenu={menu} />
          </div>
        </div>
      </section>
    </main>
  );
}
