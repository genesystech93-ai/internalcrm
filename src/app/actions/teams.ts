"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface TeamItem {
  id: string;
  name: string;
  leaderName: string | null;
  leaderUsername: string | null;
  memberCount: number;
  targetVolume: number;
  poolAmount: number;
  campaigns: string[];
}

export async function getTeamsAction(): Promise<TeamItem[]> {
  try {
    const list = await prisma.team.findMany({
      include: {
        leader: true,
        members: true,
        campaigns: true,
      },
    });

    return list.map((t) => ({
      id: t.id,
      name: t.name,
      leaderName: t.leader?.name || null,
      leaderUsername: t.leader?.username || null,
      memberCount: t.members.length,
      targetVolume: t.targetVolume,
      poolAmount: Number(t.poolAmount),
      campaigns: t.campaigns.map((c) => c.name),
    }));
  } catch {
    // Database offline — return empty list
    return [];
  }
}

export async function createTeamAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const name = formData.get("name")?.toString().trim();
  const targetVolume = parseInt(formData.get("targetVolume")?.toString() || "200", 10);
  const poolAmount = parseFloat(formData.get("poolAmount")?.toString() || "500.0");

  if (!name) return { error: "Team name is required." };

  try {
    await prisma.team.create({
      data: {
        name,
        targetVolume,
        poolAmount,
      },
    });

    revalidatePath("/admin");
    return { success: true, message: `Team "${name}" created successfully.` };
  } catch {
    return { error: "Database is offline. Unable to create team." };
  }
}
