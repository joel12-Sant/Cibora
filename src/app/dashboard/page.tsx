// src/app/dashboard/page.tsx
import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    // redirige a login o muestra 401
    return <main className="p-6">Necesitas iniciar sesión.</main>;
  }

  const role = (session.user as any).role;
  if (role !== "MERCHANT" && role !== "ADMIN") {
    return <main className="p-6">Acceso restringido.</main>;
  }

  return <main className="p-6">Panel Merchant</main>;
}
