"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface TeamMemberItem {
  id: string;
  name: string;
  username: string;
  role: string;
}

export interface TeamItem {
  id: string;
  name: string;
  leaderId: string | null;
  leaderName: string | null;
  leaderUsername: string | null;
  memberCount: number;
  members: TeamMemberItem[];
  targetVolume: number;
  poolAmount: number;
  campaigns: string[];
}

export interface AssignableStaffItem {
  id: string;
  name: string;
  username: string;
  role: string;
  currentTeamId: string | null;
  currentTeamName: string | null;
}

export async function getTeamsAction(): Promise<TeamItem[]> {
  try {
    const list = await prisma.team.findMany({
      include: {
        leader: true,
        members: {
          select: { id: true, name: true, username: true, role: true },
          orderBy: { name: "asc" },
        },
        campaigns: true,
      },
      orderBy: { name: "asc" },
    });

    return list.map((t) => ({
      id: t.id,
      name: t.name,
      leaderId: t.leaderId,
      leaderName: t.leader?.name || null,
      leaderUsername: t.leader?.username || null,
      memberCount: t.members.length,
      members: t.members,
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
    const existing = await prisma.team.findUnique({ where: { name } });
    if (existing) {
      return { error: `A team named "${name}" already exists.` };
    }

    await prisma.team.create({
      data: {
        name,
        targetVolume,
        poolAmount,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: `Team "${name}" created successfully.` };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Database error. Unable to create team." };
  }
}

export async function assignTeamMembersAction(
  teamId: string,
  memberUserIds: string[],
  leaderId?: string | null
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update team leader
      await tx.team.update({
        where: { id: teamId },
        data: { leaderId: leaderId || null },
      });

      // 2. Unassign users who were in this team but are no longer selected
      await tx.user.updateMany({
        where: {
          teamId,
          id: { notIn: memberUserIds },
        },
        data: { teamId: null },
      });

      // 3. Assign selected members to this team
      if (memberUserIds.length > 0) {
        await tx.user.updateMany({
          where: { id: { in: memberUserIds } },
          data: { teamId },
        });
      }

      // Also ensure leader is a member of the team if specified
      if (leaderId) {
        await tx.user.update({
          where: { id: leaderId },
          data: { teamId },
        });
      }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: "Team membership and leader updated successfully." };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to assign team members." };
  }
}

export async function deleteTeamAction(teamId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { teamId },
        data: { teamId: null },
      });
      await tx.team.delete({
        where: { id: teamId },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: "Team deleted successfully. Members unassigned to general floor." };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to delete team." };
  }
}

export async function getAssignableStaffAction(): Promise<AssignableStaffItem[]> {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { not: "ADMIN" },
        isActive: true,
      },
      include: { team: true },
      orderBy: { name: "asc" },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      currentTeamId: u.teamId,
      currentTeamName: u.team?.name || null,
    }));
  } catch {
    return [];
  }
}
