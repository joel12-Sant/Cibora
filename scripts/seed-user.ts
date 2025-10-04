import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const email = "test@cibora.app";
  const hash = await bcrypt.hash("secret123", 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, role: "CUSTOMER" },
    create: { email, passwordHash: hash, role: "CUSTOMER" },
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
