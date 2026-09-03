import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Genesoft Infotech CRM initial data...");

  // Password hashes
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const agentPasswordHash = await bcrypt.hash("Agent@123", 10);
  const closerPasswordHash = await bcrypt.hash("Closer@123", 10);

  // 1. Seed Admin User (Username: admin)
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "Genesoft Administrator",
      email: "admin@genesoft.com",
      password: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // 2. Seed Team
  const teamAlpha = await prisma.team.upsert({
    where: { name: "Alpha Velocity" },
    update: {},
    create: {
      name: "Alpha Velocity",
      targetVolume: 200,
      poolAmount: 500.0,
    },
  });

  // 3. Seed Agent User (Username: agent)
  const agent = await prisma.user.upsert({
    where: { username: "agent" },
    update: {},
    create: {
      username: "agent",
      name: "Sarah Connor",
      email: "agent@genesoft.com",
      password: agentPasswordHash,
      role: Role.AGENT,
      teamId: teamAlpha.id,
      isActive: true,
    },
  });

  // 4. Seed Closer User (Username: closer)
  const closer = await prisma.user.upsert({
    where: { username: "closer" },
    update: {},
    create: {
      username: "closer",
      name: "Alex Morgan",
      email: "closer@genesoft.com",
      password: closerPasswordHash,
      role: Role.CLOSER,
      teamId: teamAlpha.id,
      isActive: true,
    },
  });

  // 5. Seed Campaigns with Configurable Shift Schedules
  const campaignHealth = await prisma.campaign.upsert({
    where: { name: "USA Health Advantage" },
    update: {},
    create: {
      name: "USA Health Advantage",
      vertical: "Healthcare",
      shiftStartTime: "19:00",
      shiftEndTime: "04:00",
      lateGraceMinutes: 15,
      commissionPerLead: 15.0,
      isActive: true,
      teams: { connect: [{ id: teamAlpha.id }] },
    },
  });

  const campaignMedicare = await prisma.campaign.upsert({
    where: { name: "Medicare Advantage Plus" },
    update: {},
    create: {
      name: "Medicare Advantage Plus",
      vertical: "Insurance",
      shiftStartTime: "20:00",
      shiftEndTime: "05:00",
      lateGraceMinutes: 15,
      commissionPerLead: 20.0,
      isActive: true,
      teams: { connect: [{ id: teamAlpha.id }] },
    },
  });

  // 6. Seed Custom Statuses
  await prisma.customStatus.upsert({
    where: { name: "Follow-up Needed" },
    update: {},
    create: {
      name: "Follow-up Needed",
      colorHex: "#F59E0B",
      category: "ACTIVE",
    },
  });

  await prisma.customStatus.upsert({
    where: { name: "Supervisor Review" },
    update: {},
    create: {
      name: "Supervisor Review",
      colorHex: "#8B5CF6",
      category: "AUDIT",
    },
  });

  console.log("Seeding finished successfully!");
  console.log({
    admin: admin.username,
    agent: agent.username,
    closer: closer.username,
    campaigns: [campaignHealth.name, campaignMedicare.name],
  });
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
