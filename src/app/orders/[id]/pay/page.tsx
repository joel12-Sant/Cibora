import { prisma } from "@/lib/db";
import PayClient from "./pay-client";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  if (!session) {
    redirect(`/auth/signin?callbackUrl=/orders/${id}/pay`);
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true, total: true, tenantId: true },
  });

  if (!order) {
    return (
      <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
        <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Pagar orden</h1>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-zinc-700">
              Orden no encontrada.
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (order.status !== "CREATED") {
    return (
      <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
        <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Pagar orden</h1>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-zinc-700">
              Esta orden no está disponible para pago: <span className="font-semibold">{order.status}</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const h = await headers(); // (se mantiene como lo tienes)
  const host = h.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(`${base}/api/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie, // se reenvía la cookie como lo tienes
    },
    body: JSON.stringify({ orderId: id }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return (
      <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
        <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Pagar orden</h1>
            <div
              className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 ring-1 ring-rose-100"
              role="alert"
            >
              No se pudo iniciar el pago: {errText || res.statusText}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { clientSecret } = (await res.json()) as { clientSecret: string };

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-amber-200 via-orange-100 to-amber-50 text-zinc-900">
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-3xl bg-white/90 ring-1 ring-amber-100 shadow-lg backdrop-blur-sm p-6 sm:p-8">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Pagar orden</h1>
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">
              #{order.id.slice(0, 8)}
            </span>
          </header>

          <div className="mt-5">
            <PayClient clientSecret={clientSecret} orderId={id} />
          </div>
        </div>
      </section>
    </main>
  );
}
