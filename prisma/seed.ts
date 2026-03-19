import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface GMConfig {
  email: string;
  name: string;
  password: string;
}

function getGMConfigs(): GMConfig[] {
  const configs: GMConfig[] = [];

  // GM1 — set via GM1_EMAIL, GM1_NAME, GM1_PASSWORD
  const gm1Email = process.env.GM1_EMAIL;
  const gm1Password = process.env.GM1_PASSWORD;
  if (gm1Email && gm1Password) {
    configs.push({
      email: gm1Email,
      name: process.env.GM1_NAME ?? "General Manager 1",
      password: gm1Password,
    });
  }

  // GM2 — set via GM2_EMAIL, GM2_NAME, GM2_PASSWORD
  const gm2Email = process.env.GM2_EMAIL;
  const gm2Password = process.env.GM2_PASSWORD;
  if (gm2Email && gm2Password) {
    configs.push({
      email: gm2Email,
      name: process.env.GM2_NAME ?? "General Manager 2",
      password: gm2Password,
    });
  }

  // Fallback for local dev if no env vars are set
  if (configs.length === 0) {
    configs.push({
      email: "gm@adibacademy.com",
      name: "General Manager",
      password: "admin123",
    });
  }

  return configs;
}

async function main() {
  const gmConfigs = getGMConfigs();

  for (const config of gmConfigs) {
    const hashedPassword = await bcrypt.hash(config.password, 10);

    const gm = await prisma.user.upsert({
      where: { email: config.email },
      update: {},
      create: {
        name: config.name,
        email: config.email,
        password: hashedPassword,
        role: "GENERAL_MANAGER",
      },
    });

    console.log("✅ General Manager seeded:", gm.email);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
