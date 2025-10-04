import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return <main className="p-6">Necesitas iniciar sesión.</main>;

  if (session.user.role !== "MERCHANT_OWNER" && session.user.role !== "ADMIN") {
    return <main className="p-6">Acceso restringido.</main>;
  }

  return <main className="p-6">Panel Merchant</main>;
}
