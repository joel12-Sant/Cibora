import { PrismaClient, Role, TenantStatus, CartStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.$transaction([
    prisma.tenant.create({
      data: {
        name: "Taquería El Sol",
        status: TenantStatus.APPROVED,
        imageUrl: "https://picsum.photos/seed/taqueria/800/400",
        description: "Tacos al pastor, suadero y más, con salsa casera.",
      },
    }),
    prisma.tenant.create({
      data: {
        name: "Pizzería Don Luigi",
        status: TenantStatus.APPROVED,
        imageUrl: "https://picsum.photos/seed/pizzeria/800/400",
        description: "Pizzas artesanales a la leña, masa madre.",
      },
    }),
    prisma.tenant.create({
      data: {
        name: "Sushi Neko",
        status: TenantStatus.APPROVED,
        imageUrl: "https://picsum.photos/seed/sushi/800/400",
        description: "Sushi bar con ingredientes frescos del día.",
      },
    }),
  ]);

  const [t1, t2, t3] = tenants;

  const [merchantOwner, customer, courier] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: "owner@sol.local",
        name: "Owner Sol",
        role: Role.MERCHANT_OWNER,
        tenantId: t1.id, 
      },
    }),
    prisma.user.create({
      data: {
        email: "cliente@demo.local",
        name: "Cliente Demo",
        role: Role.CUSTOMER,
        tenantId: null,
      },
    }),
    prisma.user.create({
      data: {
        email: "repartidor@demo.local",
        name: "Repartidor Demo",
        role: Role.COURIER,
        tenantId: null,
      },
    }),
  ]);

  const menu1 = await prisma.menu.create({
    data: {
      tenantId: t1.id,
      name: "Clásicos de la Casa",
      items: {
        create: [
          {
            name: "Taco al pastor",
            price: 30,
            active: true,
            imageUrl: "https://picsum.photos/seed/pastor/600/400",
            description: "Taco de pastor con piña y cebolla.",
          },
          {
            name: "Quesadilla de suadero",
            price: 45,
            active: true,
            imageUrl: "https://picsum.photos/seed/suadero/600/400",
            description: "Quesadilla grande con suadero y queso Oaxaca.",
          },
          {
            name: "Agua de horchata",
            price: 25,
            active: true,
            imageUrl: "https://picsum.photos/seed/horchata/600/400",
            description: "Refrescante horchata casera.",
          },
        ],
      },
    },
    include: { items: true },
  });

  const menu2 = await prisma.menu.create({
    data: {
      tenantId: t2.id,
      name: "Pizzas",
      items: {
        create: [
          {
            name: "Margarita",
            price: 180,
            active: true,
            imageUrl: "https://picsum.photos/seed/margarita/600/400",
            description: "Tomate, mozzarella y albahaca.",
          },
          {
            name: "Pepperoni",
            price: 200,
            active: true,
            imageUrl: "https://picsum.photos/seed/pepperoni/600/400",
            description: "Clásica y sabrosa con pepperoni.",
          },
        ],
      },
    },
    include: { items: true },
  });

  const menu3 = await prisma.menu.create({
    data: {
      tenantId: t3.id,
      name: "Rolls y Combos",
      items: {
        create: [
          {
            name: "California Roll",
            price: 120,
            active: true,
            imageUrl: "https://picsum.photos/seed/california/600/400",
            description: "Surimi, aguacate y pepino.",
          },
          {
            name: "Combo Neko",
            price: 240,
            active: true,
            imageUrl: "https://picsum.photos/seed/neko/600/400",
            description: "Surtido de 16 piezas mixtas.",
          },
        ],
      },
    },
    include: { items: true },
  });

  const cart = await prisma.cart.upsert({
    where: {
      userId_tenantId_status: {
        userId: customer.id,
        tenantId: t1.id,
        status: CartStatus.ACTIVE,
      },
    },
    update: {},
    create: {
      userId: customer.id,
      tenantId: t1.id,
      status: CartStatus.ACTIVE,
    },
  });

  if (menu1.items.length >= 2) {
    await prisma.cartItem.createMany({
      data: [
        {
          cartId: cart.id,
          menuItemId: menu1.items[0].id,
          name: menu1.items[0].name,
          price: menu1.items[0].price,
          qty: 2,
        },
        {
          cartId: cart.id,
          menuItemId: menu1.items[1].id,
          name: menu1.items[1].name,
          price: menu1.items[1].price,
          qty: 1,
        },
      ],
    });
  }

  console.log("Seed listo ✅");
  console.log(`Tenants: ${tenants.map((t) => t.name).join(", ")}`);
  console.log(`Usuarios: ${merchantOwner.email}, ${customer.email}, ${courier.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
