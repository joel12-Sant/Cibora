import { PrismaClient, Role, TenantStatus } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const merchant = await prisma.tenant.create({
    data: { name: "Pizzería Roma", status: TenantStatus.APPROVED },
  });

  await prisma.user.create({
    data: { email: "owner@roma.test", role: Role.MERCHANT_OWNER, tenantId: merchant.id },
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

  console.log("Seed listo.");
}

main().finally(() => prisma.$disconnect());
