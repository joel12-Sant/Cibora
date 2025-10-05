import { PrismaClient, TenantStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const merchant = await prisma.tenant.create({
    data: { name: "Pizzería Roma", status: TenantStatus.APPROVED },
  });

  await prisma.user.create({
    data: { email: "owner@roma.test", role: "MERCHANT_OWNER", tenantId: merchant.id },
  });

  const menu = await prisma.menu.create({
    data: { tenantId: merchant.id, name: "Principal" },
  });

  await prisma.menuItem.createMany({
    data: [
      { menuId: menu.id, name: "Margarita", price: 120 },
      { menuId: menu.id, name: "Pepperoni", price: 140 },
    ],
  });

  // usuario de prueba con passwordHash:
  const hash = await bcrypt.hash("secret123", 10);
  await prisma.user.upsert({
    where: { email: "test@cibora.app" },
    update: { passwordHash: hash, role: "CUSTOMER" },
    create: { email: "test@cibora.app", passwordHash: hash, role: "CUSTOMER" },
  });

  console.log("Seed listo.");
}

main().finally(() => prisma.$disconnect());
