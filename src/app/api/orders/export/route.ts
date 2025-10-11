// src/app/api/orders/export/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { OrderStatus, Role, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  // 1) Auth + autorización
  const session = await auth();
  const user = session?.user as
    | { id: string; role: Role; tenantId: string | null }
    | undefined;

  const MERCHANT_ROLES = new Set<Role>([
    Role.MERCHANT_OWNER,
    Role.MERCHANT_STAFF,
    Role.ADMIN, // si quieres permitir admin
  ]);

  if (!user || !user.tenantId || !MERCHANT_ROLES.has(user.role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2) Query params
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const status =
    statusParam && (Object.values(OrderStatus) as string[]).includes(statusParam)
      ? (statusParam as OrderStatus)
      : undefined;

  const fromDate = fromParam ? safeStartOfDay(fromParam) : undefined;
  const toDate = toParam ? safeEndOfDay(toParam) : undefined;

  // 3) Filtro WHERE (👉 usar tipo de Prisma directamente)
  const where: Prisma.OrderWhereInput = {
    tenantId: user.tenantId ?? undefined,
    ...(status ? { status } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };

  // 4) Cargar pedidos + items
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      items: { select: { name: true, price: true, qty: true } },
    },
  });

  // 5) Construir CSV
  const rows: string[] = [];
  rows.push(
    [
      "order_id",
      "created_at",
      "status",
      "customer_name",
      "customer_email",
      "total_cents",
      "items_count",
      "items_breakdown",
    ]
      .map(csvEscape)
      .join(","),
  );

  for (const o of orders) {
    const itemsCount = o.items.reduce((acc, it) => acc + it.qty, 0);
    const breakdown = o.items
      .map((it) => `${it.qty} x ${it.name} ($${formatCents(it.price)})`)
      .join(" | ");

    rows.push(
      [
        o.id,
        o.createdAt.toISOString(),
        o.status,
        o.user?.name ?? "",
        o.user?.email ?? "",
        String(o.total),
        String(itemsCount),
        breakdown,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const csv = rows.join("\n");
  const filename = buildFilename(status, fromParam, toParam);

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

// ---------- helpers ----------

function csvEscape(v: string): string {
  const needsQuotes = /[",\n]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${dollars}.${remainder.toString().padStart(2, "0")}`;
}

function safeStartOfDay(isoDate: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return undefined;
  const d = new Date(`${isoDate}T00:00:00`);
  return isNaN(d.getTime()) ? undefined : d;
}

function safeEndOfDay(isoDate: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return undefined;
  const d = new Date(`${isoDate}T23:59:59.999`);
  return isNaN(d.getTime()) ? undefined : d;
}

function buildFilename(
  status?: OrderStatus,
  fromParam?: string | null,
  toParam?: string | null,
): string {
  const parts: string[] = ["orders"];
  if (status) parts.push(status.toLowerCase());
  if (fromParam || toParam) {
    parts.push((fromParam ?? "start").replaceAll("-", ""));
    parts.push((toParam ?? "now").replaceAll("-", ""));
  }
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  parts.push(ts);
  return `${parts.join("_")}.csv`;
}
