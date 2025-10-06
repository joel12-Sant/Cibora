export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    data: tenants.map(t => ({ id: t.id, name: t.name, status: t.status })),
    page: 1, pageSize: tenants.length, total: tenants.length
  });
}
