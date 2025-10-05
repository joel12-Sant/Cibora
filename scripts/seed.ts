// scripts/seed.ts
import { PrismaClient, TenantStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function ensureTenant(name: string) {
  const existing = await prisma.tenant.findFirst({ where: { name } });
  if (existing) {
    // asegura estado y devuelve
    if (existing.status !== TenantStatus.APPROVED) {
      await prisma.tenant.update({
        where: { id: existing.id },
        data: { status: TenantStatus.APPROVED },
      });
    }
    return await prisma.tenant.findUnique({ where: { id: existing.id } });
  }
  return prisma.tenant.create({
    data: { name, status: TenantStatus.APPROVED },
  });
}

async function ensureMenu(tenantId: string, menuName = "Principal") {
  const existing = await prisma.menu.findFirst({
    where: { tenantId, name: menuName },
  });
  if (existing) return existing;
  return prisma.menu.create({
    data: { tenantId, name: menuName },
  });
}

async function ensureMenuItem(menuId: string, name: string, price: number) {
  const existing = await prisma.menuItem.findFirst({
    where: { menuId, name },
  });
  if (existing) {
    // actualiza precio/activo por si cambió
    return prisma.menuItem.update({
      where: { id: existing.id },
      data: { price, active: true },
    });
  }
  return prisma.menuItem.create({
    data: { menuId, name, price, active: true },
  });
}

async function ensureUser(email: string, data: { passwordHash?: string; role: "CUSTOMER" | "MERCHANT_OWNER" | "MERCHANT_STAFF"; tenantId?: string | null; }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.user.create({
    data: { email, ...data },
  });
}

async function main() {
  // 1) Tenant
  const merchant = await ensureTenant("Pizzería Roma");

  // 2) Dueño del tenant (sin password, sólo para demo del panel)
  await ensureUser("owner@roma.test", {
    role: "MERCHANT_OWNER",
    tenantId: merchant!.id,
  });

  // 3) Menú e items
  const menu = await ensureMenu(merchant!.id, "Principal");
  await ensureMenuItem(menu.id, "Margarita", 120);
  await ensureMenuItem(menu.id, "Pepperoni", 140);

  // 4) Usuario de prueba con passwordHash (para login)
  const hash = await bcrypt.hash("secret123", 10);
  await ensureUser("test@cibora.app", {
    role: "CUSTOMER",
    passwordHash: hash,
  });

  console.log("✅ Seed listo.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
