import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import crypto from "crypto";
import { Role } from "@prisma/client";

const body = z.object({ tenantId: z.string().uuid() });
const PREFIX = "staff-request";

function tokenString(n=32){ return crypto.randomBytes(n).toString("hex"); }

// Stub de email (cámbialo por tu proveedor real)
async function sendEmail(to: string, subject: string, html: string) {
  console.log("[EMAIL]", { to, subject, html });
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as { id: string; email?: string; role: Role } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "MERCHANT_STAFF") return NextResponse.json({ error: "Debe ser empleado" }, { status: 403 });

  const json = await req.json().catch(()=>null);
  const parsed = body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { id: parsed.data.tenantId } });
  if (!tenant) return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });

  // Busca dueños del tenant
  const owners = await prisma.user.findMany({
    where: { tenantId: tenant.id, role: "MERCHANT_OWNER" },
    select: { email: true, id: true, name: true },
  });
  if (owners.length === 0) return NextResponse.json({ error: "El restaurante no tiene dueño asignado" }, { status: 409 });

  // Crea verification token (expira en 48h)
  const token = tokenString(16);
  const identifier = `${PREFIX}:${tenant.id}:${user.id}`;
  const expires = new Date(Date.now() + 48*60*60*1000);

  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = `${base}/api/staff-requests/approve?token=${encodeURIComponent(token)}`;

  // Envía email a cada owner
  await Promise.all(owners.map(o => sendEmail(
    o.email!,
    "Solicitud para unirse como empleado",
    `<p>Un usuario solicita unirse a <b>${tenant.name}</b>.</p>
     <p>Aprueba aquí: <a href="${link}">${link}</a></p>`
  )));

  return NextResponse.json({ ok: true });
}
