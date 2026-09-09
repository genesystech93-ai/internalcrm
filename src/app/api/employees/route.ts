import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listStoredUsers } from "@/lib/user-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        team: {
          select: { id: true, name: true },
        },
      },
    });

    if (users.length > 0) {
      const staff = users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        campaignName: u.team?.name || "General Floor",
        teamId: u.teamId,
        teamName: u.team?.name || null,
        createdAt: u.createdAt
          ? (u.createdAt instanceof Date ? u.createdAt.toISOString() : new Date(u.createdAt).toISOString())
          : new Date().toISOString(),
      }));

      return NextResponse.json({
        success: true,
        source: "database",
        count: staff.length,
        employees: staff,
      });
    }
  } catch (err: unknown) {
    console.error("GET /api/employees DB error:", err);
  }

  // Fallback to in-memory store
  const stored = listStoredUsers().map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    campaignName: u.campaignName || "General Floor",
    teamId: null,
    teamName: null,
    createdAt: u.createdAt,
  }));

  return NextResponse.json({
    success: true,
    source: "store-fallback",
    count: stored.length,
    employees: stored,
  });
}
