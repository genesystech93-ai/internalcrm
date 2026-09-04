import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CRM initial data — Admin User only...");

  // Password hash for admin
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);

  // 1. Seed Admin User Only (Username: admin)
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      username: "admin",
      name: "Genesoft Administrator",
      email: "admin@genesoft.com",
      password: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // Clean up any lingering mock user accounts
  await prisma.user.deleteMany({
    where: {
      username: { in: ["agent", "closer", "akashm"] },
    },
  });

  // Clean up any mock teams
  await prisma.team.deleteMany({
    where: {
      name: "Alpha Velocity",
    },
  });

  // Clean up any mock campaigns
  await prisma.campaign.deleteMany({
    where: {
      name: { in: ["USA Health Advantage", "Medicare Advantage Plus"] },
    },
  });

  console.log("Seeding finished successfully! Preserved system admin:", admin.username);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
