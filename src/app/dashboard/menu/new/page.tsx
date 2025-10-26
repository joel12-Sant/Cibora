import { auth } from "@/lib/auth";
import Link from "next/link";
import { Role } from "@prisma/client";
import NewMenuForm from "./NewMenuForm";

export default async function NewMenuPage() {
  const session = await auth();
  const user = session?.user ?? null;
  const ALLOWED = new Set<Role>([Role.MERCHANT_OWNER, Role.MERCHANT_STAFF, Role.ADMIN]);

  if (!user || !user.tenantId || !ALLOWED.has(user.role)) {
    return (
      <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
        <section className="mx-auto w-full max-w-md px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">No autorizado</h1>
            <p className="mt-2 text-sm text-zinc-600">Necesitas permisos para crear menús.</p>
            <div className="mt-4">
              <Link
                className="text-zinc-700 underline underline-offset-2 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md px-1 py-1"
                href="/"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Crear nuevo menú</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Define el nombre del menú. Podrás agregar ítems después.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="text-zinc-700 underline underline-offset-2 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md px-2 py-1"
              >
                Cancelar y volver
              </Link>
            </div>
          </header>

          <div className="mt-6">
            {/* Client Component con validación y estilos Cibora */}
            <NewMenuForm />
          </div>
        </div>
      </section>
    </main>
  );
}
