import { PrismaClient, Role, OrderStatus, CartStatus, VehicleType, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// =====================
// helpers
// =====================
const toCents = (mxn: number) => Math.round(mxn * 100);
const px = (n: number) => new Prisma.Decimal(n.toFixed(6));
const now = () => new Date();

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

// =====================
// catálogo base
// =====================
type TenantSeed = {
  key: string;
  name: string;
  description: string;
  imageUrl: string;
  address: {
    label?: string;
    line1: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    lat: number;
    lng: number;
  };
  menuName: string;
  items: Array<{ name: string; price: number; imageUrl?: string; description?: string }>;
};

const TENANTS: TenantSeed[] = [
  {
    key: "sol",
    name: "Taquería El Sol",
    description: "Tacos al pastor, gringas y salsas caseras.",
    imageUrl: "https://picsum.photos/seed/sol/800/600",
    address: {
      label: "Sucursal Centro",
      line1: "Av. Independencia 123",
      city: "CDMX",
      state: "CDMX",
      postalCode: "06000",
      country: "MX",
      lat: 19.432608, // Zócalo
      lng: -99.133209,
    },
    menuName: "Carta principal",
    items: [
      { name: "Taco al pastor", price: 25, imageUrl: "https://picsum.photos/seed/pastor/800/600", description: "Con piña y cebolla." },
      { name: "Gringa de pastor", price: 45, imageUrl: "https://picsum.photos/seed/gringa/800/600", description: "Harina, queso y pastor." },
      { name: "Quesadilla de asada", price: 38, imageUrl: "https://picsum.photos/seed/quesa/800/600" },
      { name: "Coca-Cola 355ml", price: 20, imageUrl: "https://picsum.photos/seed/coca/800/600" },
    ],
  },
  {
    key: "tanaka",
    name: "Ramen Tanaka",
    description: "Caldo intenso, fideos artesanales y toppings frescos.",
    imageUrl: "https://picsum.photos/seed/ramen/800/600",
    address: {
      label: "Roma Norte",
      line1: "Calle Orizaba 200",
      city: "CDMX",
      state: "CDMX",
      postalCode: "06700",
      country: "MX",
      lat: 19.420165,
      lng: -99.163444,
    },
    menuName: "Ramen & más",
    items: [
      { name: "Ramen Tonkotsu", price: 145, imageUrl: "https://picsum.photos/seed/tonkotsu/800/600" },
      { name: "Ramen Shoyu", price: 135, imageUrl: "https://picsum.photos/seed/shoyu/800/600" },
      { name: "Gyozas (6 pzas.)", price: 78, imageUrl: "https://picsum.photos/seed/gyoza/800/600" },
      { name: "Té verde frío", price: 35 },
    ],
  },
  {
    key: "napoles",
    name: "Pizzería Don Nápoles",
    description: "Masa delgada, horno de piedra y mejores ingredientes.",
    imageUrl: "https://picsum.photos/seed/pizza/800/600",
    address: {
      label: "Condesa",
      line1: "Av. Tamaulipas 101",
      city: "CDMX",
      state: "CDMX",
      postalCode: "06140",
      country: "MX",
      lat: 19.412772,
      lng: -99.176092,
    },
    menuName: "Pizzas & bebidas",
    items: [
      { name: "Margarita (chica)", price: 109, imageUrl: "https://picsum.photos/seed/marga/800/600" },
      { name: "Pepperoni (mediana)", price: 165, imageUrl: "https://picsum.photos/seed/pepperoni/800/600" },
      { name: "Cuatro quesos (grande)", price: 229, imageUrl: "https://picsum.photos/seed/4cheese/800/600" },
      { name: "Refresco 600ml", price: 28 },
    ],
  },
  {
    key: "pantera",
    name: "Café Pantera",
    description: "Café de especialidad y pan dulce recién horneado.",
    imageUrl: "https://picsum.photos/seed/cafe/800/600",
    address: {
      label: "Juárez",
      line1: "Londres 45",
      city: "CDMX",
      state: "CDMX",
      postalCode: "06600",
      country: "MX",
      lat: 19.427011,
      lng: -99.159333,
    },
    menuName: "Cafetería",
    items: [
      { name: "Espresso", price: 30 },
      { name: "Latte", price: 45 },
      { name: "Cold Brew", price: 55 },
      { name: "Concha de vainilla", price: 22 },
    ],
  },
];

// =====================
// seed principal
// =====================
async function main() {
  // --------- usuarios base
  const password = await bcrypt.hash("demo1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@cibora.dev" },
    update: {},
    create: {
      email: "admin@cibora.dev",
      name: "Admin",
      passwordHash: password,
      role: Role.ADMIN,
    },
  });

  // dos clientes “globales”
  const customers = await Promise.all(
    ["cliente1@cibora.dev", "cliente2@cibora.dev"].map((email, i) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: `Cliente ${i + 1}`,
          passwordHash: password,
          role: Role.CUSTOMER,
          addresses: {
            create: [
              {
                label: "Casa",
                line1: `Calle Uno #${100 + i}`,
                city: "CDMX",
                postalCode: "01010",
                country: "MX",
                latitude: px(19.40 + Math.random() * 0.05),
                longitude: px(-99.15 - Math.random() * 0.03),
                isPrimary: true,
              },
            ],
          },
        },
      })
    )
  );

  // --------- crear tenants, su gente y sus menús
  for (const t of TENANTS) {
    // Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: t.name,
        status: "APPROVED",
        description: t.description,
        imageUrl: t.imageUrl,
        addresses: {
          create: {
            label: t.address.label ?? "Sucursal",
            line1: t.address.line1,
            city: t.address.city,
            state: t.address.state,
            postalCode: t.address.postalCode,
            country: t.address.country,
            latitude: px(t.address.lat),
            longitude: px(t.address.lng),
            isPrimary: true,
          },
        },
      },
      include: { addresses: true },
    });

    // Owner + Staff + Courier del tenant
    const owner = await prisma.user.create({
      data: {
        email: `owner+${t.key}@cibora.dev`,
        name: `Owner ${t.name}`,
        passwordHash: password,
        role: Role.MERCHANT_OWNER,
        tenantId: tenant.id,
      },
    });
    const staff = await prisma.user.create({
      data: {
        email: `staff+${t.key}@cibora.dev`,
        name: `Staff ${t.name}`,
        passwordHash: password,
        role: Role.MERCHANT_STAFF,
        tenantId: tenant.id,
      },
    });
    const courier = await prisma.user.create({
      data: {
        email: `courier+${t.key}@cibora.dev`,
        name: `Repartidor ${t.name}`,
        passwordHash: password,
        role: Role.COURIER,
        vehicleType: pick([VehicleType.MOTORCYCLE, VehicleType.CAR]),
        addresses: {
          create: [
            {
              label: "Base",
              line1: "Patio de carga",
              city: t.address.city,
              postalCode: t.address.postalCode,
              country: "MX",
              latitude: px(t.address.lat + 0.01),
              longitude: px(t.address.lng - 0.01),
              isPrimary: true,
            },
          ],
        },
      },
    });

    // Menú + Items
    const menu = await prisma.menu.create({
      data: {
        name: t.menuName,
        tenantId: tenant.id,
        items: {
          create: t.items.map((it) => ({
            name: it.name,
            price: toCents(it.price),
            active: true,
            imageUrl: it.imageUrl,
            description: it.description,
          })),
        },
      },
      include: { items: true },
    });

    // --------- carritos activos para cada customer en este tenant
    for (const c of customers) {
      // 1 solo carrito ACTIVE por unique (userId, tenantId, status)
      await prisma.cart.create({
        data: {
          userId: c.id,
          tenantId: tenant.id,
          status: CartStatus.ACTIVE,
          items: {
            create: range(1 + Math.floor(Math.random() * 2)).map(() => {
              const mi = pick(menu.items);
              return {
                menuItemId: mi.id, // snapshot ref
                name: mi.name,
                price: mi.price,
                qty: 1 + Math.floor(Math.random() * 2),
              };
            }),
          },
        },
      });
    }

    // --------- órdenes de ejemplo para cada customer
    for (const c of customers) {
      const ordersToCreate = 2;
      for (let k = 0; k < ordersToCreate; k++) {
        const chosen = range(1 + Math.floor(Math.random() * 3)).map(() => pick(menu.items));
        const orderItems = chosen.map((mi) => ({
          itemId: mi.id,
          name: mi.name,
          price: mi.price,
          qty: 1 + Math.floor(Math.random() * 2),
        }));
        const total = orderItems.reduce((sum, it) => sum + it.price * it.qty, 0);

        // distribuye estados realistas
        const status = pick<OrderStatus>([
          OrderStatus.CREATED,
          OrderStatus.PAID,
          OrderStatus.PREPARING,
          OrderStatus.OUT_FOR_DELIVERY,
          OrderStatus.DELIVERED,
          OrderStatus.CANCELED,
        ]);

        const order = await prisma.order.create({
          data: {
            tenantId: tenant.id,
            userId: c.id,
            status,
            total,
            items: { create: orderItems },
            payments: {
              create:
                status === OrderStatus.PAID || status === OrderStatus.DELIVERED || status === OrderStatus.OUT_FOR_DELIVERY
                  ? [{ provider: "stripe", status: "succeeded", extRef: `pi_${Math.random().toString(36).slice(2, 10)}` }]
                  : status === OrderStatus.CANCELED
                  ? [{ provider: "stripe", status: "canceled" }]
                  : [{ provider: "cash", status: "pending" }],
            },
          },
        });

        // ajusta createdAt para tener historial más “vivo”
        const backDays = 1 + Math.floor(Math.random() * 20);
        await prisma.order.update({
          where: { id: order.id },
          data: { createdAt: new Date(Date.now() - backDays * 24 * 60 * 60 * 1000) },
        });
      }
    }

    console.log(`✔ Seed tenant: ${tenant.name} — owner=${owner.email} staff=${staff.email}`);
  }

  console.log("✔ Admin:", admin.email);
  console.log("✔ Customers:", customers.map((c) => c.email).join(", "));
}

main()
  .then(async () => {
    console.log("Seed OK");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed ERROR:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
