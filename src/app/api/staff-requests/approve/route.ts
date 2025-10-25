import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PREFIX = "staff-request";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";

  const vt = await prisma.verificationToken.findFirst({
    where: { token },
  });

  if (!vt) return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  if (vt.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(()=>{});
    return NextResponse.json({ error: "Token expirado" }, { status: 400 });
  }

  // identifier: staff-request:tenantId:userId
  const parts = vt.identifier.split(":");
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }
  const tenantId = parts[1];
  const userId = parts[2];

  // Asigna tenant al empleado
  await prisma.user.update({
    where: { id: userId },
    data: { tenantId },
  });

  await prisma.verificationToken.delete({ where: { token } }).catch(()=>{});

  // Puedes redirigir a un "aprobado" bonito:
  return NextResponse.json({ ok: true, message: "Empleado aprobado" });
}
