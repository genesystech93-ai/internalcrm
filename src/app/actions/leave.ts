"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { LeaveType, LeaveStatus } from "@prisma/client";

export interface LeaveActionResult {
  success?: boolean;
  error?: string;
  message?: string;
}

// 1. Apply Leave Action
export async function applyLeaveAction(formData: FormData): Promise<LeaveActionResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const leaveType = (formData.get("leaveType")?.toString() || "CASUAL") as LeaveType;
  const startDateStr = formData.get("startDate")?.toString();
  const endDateStr = formData.get("endDate")?.toString();
  const reason = formData.get("reason")?.toString().trim();

  if (!startDateStr || !endDateStr) {
    return { error: "Please provide both start and end dates." };
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (endDate < startDate) {
    return { error: "End date cannot be earlier than start date." };
  }

  try {
    await prisma.leaveRequest.create({
      data: {
        userId: session.userId,
        leaveType,
        startDate,
        endDate,
        reason: reason || "Personal reason",
        status: "PENDING",
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, message: "Leave application submitted for Admin approval." };
  } catch {
    return { error: "Database is offline. Unable to submit leave application." };
  }
}

// 2. Review Leave Action (Admin Approve / Reject)
export async function reviewLeaveAction(
  leaveId: string,
  status: LeaveStatus
): Promise<LeaveActionResult> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status,
        reviewedById: session.userId,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, message: `Leave request marked as ${status}.` };
  } catch {
    return { error: "Database is offline. Unable to review leave request." };
  }
}

// 3. Get Leave Requests
export async function getLeaveRequestsAction() {
  const session = await getSession();
  if (!session) return [];

  const isAdmin = session.role === "ADMIN";

  try {
    const list = await prisma.leaveRequest.findMany({
      where: isAdmin ? {} : { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });

    return list.map((l) => ({
      id: l.id,
      username: l.user.username,
      name: l.user.name,
      leaveType: l.leaveType,
      startDate: l.startDate.toISOString().split("T")[0],
      endDate: l.endDate.toISOString().split("T")[0],
      reason: l.reason,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
    }));
  } catch {
    // Database offline — return empty list
    return [];
  }
}
