import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  const gm = await prisma.user.upsert({
    where: { email: "gm@adibacademy.com" },
    update: {},
    create: {
      name: "General Manager",
      email: "gm@adibacademy.com",
      password,
      role: "GENERAL_MANAGER",
    },
  });

  console.log("✅ General Manager created:", gm.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
