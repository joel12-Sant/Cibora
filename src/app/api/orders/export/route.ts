// src/app/api/orders/export/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { OrderStatus, Role } from "@prisma/client";

function isOrderStatus(x: unknown): x is OrderStatus {
  return typeof x === "string" && (Object.values(OrderStatus) as string[]).includes(x);
}

function parseDate(d?: string | null): Date | undefined {
  if (!d) return undefined;
  const t = Date.parse(d);
  return Number.isFinite(t) ? new Date(t) : undefined;
}

function csvEscape(v: string): string {
  // Escapa comillas dobles y rodea en comillas si hay comas, comillas o saltos de línea
  const needsWrap = /[",\n]/.test(v);
  const esc = v.replace(/"/g, '""');
  return needsWrap ? `"${esc}"` : esc;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const role = session.user.role as Role;
  const tenantId = session.user.tenantId ?? null;
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const status = isOrderStatus(statusParam) ? statusParam : undefined;
  const from = parseDate(fromParam);
  const to = parseDate(toParam);

  // Filtros base (tenant guard)
  const whereBase: Record<string, unknown> = {};
  if (role !== "ADMIN") {
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant inválido" }, { status: 403 });
    }
    whereBase.tenantId = tenantId;
  }
  if (status) whereBase.status = status;
  if (from || to) {
    whereBase.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const orders = await prisma.order.findMany({
    where: whereBase,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      status: true,
      total: true, // en PESOS (p.ej. 640 = $640.00)
      user: { select: { email: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  // Armar CSV
  const header = [
    "order_id",
    "created_at",
    "status",
    "items_count",
    "total_mxn",
    "customer_email",
    "customer_name",
  ];
  const rows = orders.map((o) => [
    o.id,
    o.createdAt.toISOString(),
    o.status,
    String(o._count.items),
    // total en pesos, con 2 decimales para planillas
    (o.total ?? 0).toFixed(2),
    o.user?.email ?? "",
    o.user?.name ?? "",
  ]);

  const csv = [header, ...rows]
    .map((cols) => cols.map((c) => csvEscape(String(c))).join(","))
    .join("\n");

  const res = new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_export.csv"`,
      "Cache-Control": "no-store",
    },
  });

  return res;
}
