"use server";
// Genesoft Infotech CRM - Shift Attendance Action Engine

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { AttendanceStatus, BreakType } from "@prisma/client";
import { getStoredUser } from "@/lib/user-store";

export interface AttendanceResult {
  success?: boolean;
  error?: string;
  attendanceId?: string;
  breakLogId?: string;
  isUndoWindowActive?: boolean;
  message?: string;
}

// In-memory dynamic floor attendance registry for offline development
export interface DevAttendance {
  id: string;
  userId: string;
  campaignId: string | null;
  shiftDate: Date;
  loginAt: Date;
  logoutAt: Date | null;
  totalMinutes: number;
  status: AttendanceStatus;
  breaks: DevBreakLog[];
}

export interface DevBreakLog {
  id: string;
  attendanceId: string;
  userId: string;
  breakType: BreakType;
  customReason: string | null;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number;
}

// Starts completely clean (0 sample records)
const devAttendances: DevAttendance[] = [];

export async function getDevAttendances(): Promise<DevAttendance[]> {
  return devAttendances;
}

// Helper: Calculate shift attribution date (night shifts starting e.g. 7PM attributed to the calendar start date)
function calculateShiftDate(now: Date, shiftStartHour = 19): Date {
  const d = new Date(now);
  // If current time is early morning before e.g. 12:00 PM, and shift started evening, attribute to yesterday
  if (d.getHours() < 12 && shiftStartHour >= 12) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: Calculate scheduled shift conclusion timestamp (e.g. 04:00 AM next morning for 19:00 - 04:00 shift)
function getScheduledShiftEndTime(
  shiftDate: Date | string,
  shiftStartTime = "19:00",
  shiftEndTime = "04:00"
): Date {
  const [startH] = (shiftStartTime || "19:00").split(":").map(Number);
  const [endH, endM] = (shiftEndTime || "04:00").split(":").map(Number);

  const base = new Date(shiftDate);
  const endDateTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), endH, endM, 0, 0);
  // If end hour is less than start hour (e.g. overnight shift 19:00 to 04:00), end time is next morning
  if (endH < startH) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }
  return endDateTime;
}

// Core Engine: Auto Shift Log Out After 04:00 AM
export async function autoLogoutExpiredShifts(targetUserId?: string): Promise<number> {
  const now = new Date();
  let count = 0;

  try {
    let defaultStartTime = "19:00";
    let defaultEndTime = "04:00";
    try {
      const [startSetting, endSetting] = await Promise.all([
        prisma.systemSetting.findUnique({ where: { key: "global_shift_start_time" } }),
        prisma.systemSetting.findUnique({ where: { key: "global_shift_end_time" } }),
      ]);
      if (startSetting?.value) defaultStartTime = startSetting.value;
      if (endSetting?.value) defaultEndTime = endSetting.value;
    } catch {
      // Fallback to defaults
    }

    const openAttendances = await prisma.attendance.findMany({
      where: {
        logoutAt: null,
        ...(targetUserId ? { userId: targetUserId } : {}),
      },
      include: {
        campaign: true,
        breaks: true,
      },
    });

    for (const att of openAttendances) {
      const shiftStartTimeStr = att.campaign?.shiftStartTime || defaultStartTime;
      const shiftEndTimeStr = att.campaign?.shiftEndTime || defaultEndTime;
      const scheduledEnd = getScheduledShiftEndTime(att.shiftDate, shiftStartTimeStr, shiftEndTimeStr);

      // Check if current time has passed scheduled shift conclusion (e.g. after 04:00 AM)
      if (now.getTime() >= scheduledEnd.getTime()) {
        let additionalBreakMins = 0;
        for (const b of att.breaks) {
          if (b.endTime === null) {
            const bDuration = Math.max(0, Math.round((scheduledEnd.getTime() - new Date(b.startTime).getTime()) / 60000));
            await prisma.breakLog.update({
              where: { id: b.id },
              data: {
                endTime: scheduledEnd,
                durationMinutes: bDuration,
              },
            });
            additionalBreakMins += bDuration;
          }
        }

        const closedBreaksDuration = att.breaks
          .filter((b) => b.endTime !== null)
          .reduce((sum, b) => sum + (b.durationMinutes || 0), 0) + additionalBreakMins;

        const grossMinutes = Math.max(
          0,
          Math.round((scheduledEnd.getTime() - new Date(att.loginAt).getTime()) / 60000)
        );
        const netMinutes = Math.max(0, grossMinutes - closedBreaksDuration);

        await prisma.attendance.update({
          where: { id: att.id },
          data: {
            logoutAt: scheduledEnd,
            totalMinutes: netMinutes,
          },
        });
        count++;
      }
    }
  } catch {
    // Offline Dev Fallback
    for (const devAtt of devAttendances) {
      if (devAtt.logoutAt === null && (!targetUserId || devAtt.userId === targetUserId)) {
        const scheduledEnd = getScheduledShiftEndTime(devAtt.shiftDate, "19:00", "04:00");
        if (now.getTime() >= scheduledEnd.getTime()) {
          devAtt.logoutAt = scheduledEnd;
          const totalBreakMinutes = devAtt.breaks.reduce((acc, b) => {
            if (b.endTime === null) {
              b.endTime = scheduledEnd;
              b.durationMinutes = Math.max(0, Math.round((scheduledEnd.getTime() - new Date(b.startTime).getTime()) / 60000));
            }
            return acc + (b.durationMinutes || 0);
          }, 0);
          const grossMinutes = Math.max(0, Math.round((scheduledEnd.getTime() - new Date(devAtt.loginAt).getTime()) / 60000));
          devAtt.totalMinutes = Math.max(0, grossMinutes - totalBreakMinutes);
          count++;
        }
      }
    }
  }

  return count;
}

// 1. Shift Log In Action
export async function loginShiftAction(campaignId?: string): Promise<AttendanceResult> {
  const session = await getSession();
  if (!session) return { error: "You must be logged in to log in to a shift." };

  // First auto-logout any expired past shifts before starting/resuming
  await autoLogoutExpiredShifts(session.userId);

  const now = new Date();
  let shiftStartTimeStr = "19:00";
  let lateGraceMinutes = 15;

  try {
    if (campaignId) {
      const camp = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (camp) {
        shiftStartTimeStr = camp.shiftStartTime;
        lateGraceMinutes = camp.lateGraceMinutes;
      }
    } else {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { team: { include: { campaigns: true } } },
      });
      if (user?.team?.campaigns?.length) {
        campaignId = user.team.campaigns[0].id;
        shiftStartTimeStr = user.team.campaigns[0].shiftStartTime || shiftStartTimeStr;
        lateGraceMinutes = user.team.campaigns[0].lateGraceMinutes ?? lateGraceMinutes;
      }
    }
  } catch {
    // Database offline fallback
  }

  // Parse shift start time (e.g. "19:00" -> 19 hours, 0 mins)
  const [startH, startM] = shiftStartTimeStr.split(":").map(Number);
  const shiftDate = calculateShiftDate(now, startH);

  // Late mark calculation: If login time is past shiftStartTime + lateGraceMinutes
  let isLate = false;
  const scheduledStartMs = new Date(shiftDate).setHours(startH, startM + lateGraceMinutes, 0, 0);
  if (now.getTime() > scheduledStartMs) {
    isLate = true;
  }

  const initialStatus: AttendanceStatus = isLate ? "LATE" : "PRESENT";

  try {
    // Check if an attendance record already exists for today's shift
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: session.userId,
        shiftDate: {
          gte: new Date(new Date(shiftDate).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(shiftDate).setHours(23, 59, 59, 999)),
        },
      },
    });

    if (existing) {
      // Re-activating shift (multi-session or undo)
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          logoutAt: null,
          campaignId: campaignId || existing.campaignId,
        },
      });
      revalidatePath("/dashboard");
      revalidatePath("/admin");
      return { success: true, attendanceId: updated.id, message: "Shift resumed successfully." };
    }

    const created = await prisma.attendance.create({
      data: {
        userId: session.userId,
        campaignId: campaignId || null,
        shiftDate,
        loginAt: now,
        status: initialStatus,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return {
      success: true,
      attendanceId: created.id,
      message: isLate ? "Logged In (Marked LATE as log-in exceeded grace threshold)" : "Logged In to Shift (ON TIME)",
    };
  } catch {
    // Offline Dev Fallback
    const existingDev = devAttendances.find((a) => a.userId === session.userId && a.logoutAt === null);
    if (existingDev) {
      return { success: true, attendanceId: existingDev.id, message: "Shift active (Dev Mode)." };
    }

    const newDev: DevAttendance = {
      id: `dev-att-${Date.now()}`,
      userId: session.userId,
      campaignId: campaignId || null,
      shiftDate,
      loginAt: now,
      logoutAt: null,
      totalMinutes: 0,
      status: initialStatus,
      breaks: [],
    };

    devAttendances.push(newDev);
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return {
      success: true,
      attendanceId: newDev.id,
      message: isLate ? "Logged In (Marked LATE - Dev Mode)" : "Logged In to Shift (ON TIME - Dev Mode)",
    };
  }
}

// 2. Shift Log Out Action (With 15-Minute Undo Grace Window)
export async function logoutShiftAction(attendanceId?: string): Promise<AttendanceResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const now = new Date();

  try {
    let attendance = attendanceId
      ? await prisma.attendance.findUnique({
          where: { id: attendanceId },
          include: { breaks: true },
        })
      : null;

    if (!attendance) {
      attendance = await prisma.attendance.findFirst({
        where: { userId: session.userId, logoutAt: null },
        orderBy: { loginAt: "desc" },
        include: { breaks: true },
      });
    }

    if (!attendance) return { error: "No active attendance record found to log out." };

    // Close any open breaks before finalizing shift logout
    for (const b of attendance.breaks) {
      if (b.endTime === null) {
        const bDuration = Math.max(1, Math.round((now.getTime() - new Date(b.startTime).getTime()) / 60000));
        await prisma.breakLog.update({
          where: { id: b.id },
          data: { endTime: now, durationMinutes: bDuration },
        });
        b.endTime = now;
        b.durationMinutes = bDuration;
      }
    }

    // Calculate total break minutes
    const totalBreakMinutes = attendance.breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
    const grossMinutes = Math.max(0, Math.round((now.getTime() - new Date(attendance.loginAt).getTime()) / 60000));
    const netMinutes = Math.max(0, grossMinutes - totalBreakMinutes);

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        logoutAt: now,
        totalMinutes: netMinutes,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return {
      success: true,
      attendanceId: attendance.id,
      isUndoWindowActive: true,
      message: "You have Logged Out. 15-minute Resume Shift grace window is active.",
    };
  } catch {
    // Offline Dev Fallback
    const devAtt = devAttendances.find((a) => (attendanceId && a.id === attendanceId) || (a.userId === session.userId && a.logoutAt === null));
    if (devAtt) {
      devAtt.logoutAt = now;
      const totalBreakMinutes = devAtt.breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
      const grossMinutes = Math.max(0, Math.round((now.getTime() - new Date(devAtt.loginAt).getTime()) / 60000));
      devAtt.totalMinutes = Math.max(0, grossMinutes - totalBreakMinutes);
    }

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return {
      success: true,
      attendanceId: devAtt ? devAtt.id : attendanceId,
      isUndoWindowActive: true,
      message: "Logged Out. 15-minute Resume Shift grace window is active (Dev Mode).",
    };
  }
}

// 3. 15-Minute Accidental Log-Out Grace Window / Undo Action
export async function undoLogoutAction(attendanceId?: string): Promise<AttendanceResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const now = new Date();

  try {
    let record = attendanceId
      ? await prisma.attendance.findUnique({ where: { id: attendanceId } })
      : null;

    if (!record) {
      record = await prisma.attendance.findFirst({
        where: { userId: session.userId, logoutAt: { not: null } },
        orderBy: { logoutAt: "desc" },
      });
    }

    if (!record || !record.logoutAt) return { error: "No recent logout found to undo." };

    const elapsedMinutes = (now.getTime() - new Date(record.logoutAt).getTime()) / 60000;
    if (elapsedMinutes > 15) {
      return { error: "The 15-minute Resume Shift grace window has expired. Please Log In for a new session." };
    }

    await prisma.attendance.update({
      where: { id: record.id },
      data: { logoutAt: null },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, attendanceId: record.id, message: "Log-out undone. Active shift seamlessly restored with zero lost time." };
  } catch {
    // Offline Dev Fallback
    const devAtt = devAttendances.find((a) => (attendanceId && a.id === attendanceId) || (a.userId === session.userId && a.logoutAt !== null));
    if (devAtt && devAtt.logoutAt) {
      const elapsedMinutes = (now.getTime() - new Date(devAtt.logoutAt).getTime()) / 60000;
      if (elapsedMinutes > 15) {
        return { error: "The 15-minute Resume Shift grace window has expired. Please Log In for a new session." };
      }
      devAtt.logoutAt = null;
    }
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, attendanceId: devAtt ? devAtt.id : attendanceId, message: "Log-out undone. Shift resumed seamlessly (Dev Mode)." };
  }
}

// 4. Start Break Action (1st Tea, Dinner, Midnight Tea, Custom)
export async function startBreakAction(
  attendanceId: string,
  breakType: BreakType,
  customReason?: string
): Promise<AttendanceResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const now = new Date();

  try {
    const breakLog = await prisma.breakLog.create({
      data: {
        attendanceId,
        userId: session.userId,
        breakType,
        customReason: customReason || null,
        startTime: now,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, breakLogId: breakLog.id, message: `Break started: ${breakType}` };
  } catch {
    // Offline Dev Fallback
    const devAtt = devAttendances.find((a) => a.id === attendanceId || a.userId === session.userId);
    const newBreak: DevBreakLog = {
      id: `dev-break-${Date.now()}`,
      attendanceId: devAtt ? devAtt.id : attendanceId,
      userId: session.userId,
      breakType,
      customReason: customReason || null,
      startTime: now,
      endTime: null,
      durationMinutes: 0,
    };

    if (devAtt) {
      devAtt.breaks.push(newBreak);
    }

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, breakLogId: newBreak.id, message: `Break started: ${breakType} (Dev Mode)` };
  }
}

// 5. End Break / Resume Floor Action
export async function endBreakAction(breakLogId: string): Promise<AttendanceResult> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const now = new Date();

  try {
    const breakLog = await prisma.breakLog.findUnique({ where: { id: breakLogId } });
    if (!breakLog) return { error: "Break log not found." };

    const durationMinutes = Math.max(1, Math.round((now.getTime() - new Date(breakLog.startTime).getTime()) / 60000));

    await prisma.breakLog.update({
      where: { id: breakLogId },
      data: {
        endTime: now,
        durationMinutes,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, message: `Break ended. Duration: ${durationMinutes} minutes.` };
  } catch {
    // Offline Dev Fallback
    for (const att of devAttendances) {
      const b = att.breaks.find((brk) => brk.id === breakLogId || brk.endTime === null);
      if (b) {
        b.endTime = now;
        b.durationMinutes = Math.max(1, Math.round((now.getTime() - new Date(b.startTime).getTime()) / 60000));
        break;
      }
    }
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, message: "Break ended. Shift resumed (Dev Mode)." };
  }
}

// 6. Get Active Shift Status for Current User
export async function getActiveShiftStatusAction() {
  const session = await getSession();
  if (!session) return null;

  // Auto-logout expired shift if past 04:00 AM
  await autoLogoutExpiredShifts(session.userId);

  const now = new Date();

  try {
    // Find latest attendance for current user
    const attendance = await prisma.attendance.findFirst({
      where: { userId: session.userId },
      orderBy: { loginAt: "desc" },
      include: {
        campaign: true,
        breaks: { orderBy: { startTime: "desc" } },
      },
    });

    if (!attendance) return null;

    const shiftStartTimeStr = attendance.campaign?.shiftStartTime || "19:00";
    const [startH] = shiftStartTimeStr.split(":").map(Number);
    const todayShiftDate = calculateShiftDate(now, startH);

    // If the attendance record is from a prior calendar shift day and has already concluded,
    // then the user has NOT clocked in for today's shift yet -> return null
    if (attendance.logoutAt !== null && new Date(attendance.shiftDate).getTime() < todayShiftDate.getTime()) {
      return null;
    }

    // Check if logout was within 15 mins (undo window)
    let isUndoEligible = false;
    let logoutElapsedMinutes = 0;
    if (attendance.logoutAt) {
      logoutElapsedMinutes = Math.round((now.getTime() - new Date(attendance.logoutAt).getTime()) / 60000);
      if (logoutElapsedMinutes <= 15) {
        isUndoEligible = true;
      }
    }

    const activeBreak = attendance.breaks.find((b) => b.endTime === null);

    return {
      attendanceId: attendance.id,
      loginAt: attendance.loginAt.toISOString(),
      logoutAt: attendance.logoutAt ? attendance.logoutAt.toISOString() : null,
      status: attendance.status,
      campaignName: attendance.campaign?.name || "Standard Operations",
      shiftStartTime: attendance.campaign?.shiftStartTime || "19:00",
      shiftEndTime: attendance.campaign?.shiftEndTime || "04:00",
      isLoggedOut: !!attendance.logoutAt,
      isUndoEligible,
      logoutElapsedMinutes,
      activeBreak: activeBreak
        ? {
            id: activeBreak.id,
            breakType: activeBreak.breakType,
            customReason: activeBreak.customReason,
            startTime: activeBreak.startTime.toISOString(),
          }
        : null,
      breaks: attendance.breaks.map((b) => ({
        id: b.id,
        breakType: b.breakType,
        customReason: b.customReason,
        durationMinutes: b.durationMinutes,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime ? b.endTime.toISOString() : null,
      })),
    };
  } catch {
    // Offline Dev Fallback
    const todayShiftDate = calculateShiftDate(now, 19);
    const devAtt = devAttendances.find(
      (a) =>
        a.userId === session.userId &&
        (a.logoutAt === null ||
          (new Date(a.shiftDate).getTime() >= todayShiftDate.getTime() &&
            (now.getTime() - new Date(a.logoutAt).getTime()) / 60000 <= 15))
    );
    if (!devAtt) return null;

    const activeBreak = devAtt.breaks.find((b) => b.endTime === null);
    let isUndoEligible = false;
    let logoutElapsedMinutes = 0;
    if (devAtt.logoutAt) {
      logoutElapsedMinutes = Math.round((now.getTime() - new Date(devAtt.logoutAt).getTime()) / 60000);
      if (logoutElapsedMinutes <= 15) isUndoEligible = true;
    }

    return {
      attendanceId: devAtt.id,
      loginAt: devAtt.loginAt.toISOString(),
      logoutAt: devAtt.logoutAt ? devAtt.logoutAt.toISOString() : null,
      status: devAtt.status,
      campaignName: devAtt.campaignId || "General Floor",
      shiftStartTime: "19:00",
      shiftEndTime: "04:00",
      isLoggedOut: !!devAtt.logoutAt,
      isUndoEligible,
      logoutElapsedMinutes,
      activeBreak: activeBreak
        ? {
            id: activeBreak.id,
            breakType: activeBreak.breakType,
            customReason: activeBreak.customReason,
            startTime: activeBreak.startTime.toISOString(),
          }
        : null,
      breaks: devAtt.breaks.map((b) => ({
        id: b.id,
        breakType: b.breakType,
        customReason: b.customReason,
        durationMinutes: b.durationMinutes,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime ? b.endTime.toISOString() : null,
      })),
    };
  }
}

// 7. Admin Floor Attendance Monitor Action
export async function getFloorAttendanceAction() {
  const session = await getSession();
  if (session && session.role !== "ADMIN") throw new Error("Unauthorized");

  // Auto-logout any expired shifts across the entire floor
  await autoLogoutExpiredShifts();

  try {
    const list = await prisma.attendance.findMany({
      orderBy: { loginAt: "desc" },
      take: 20,
      include: {
        user: true,
        campaign: true,
        breaks: true,
      },
    });

    return list.map((a) => {
      const activeBreak = a.breaks.find((b) => b.endTime === null);
      const totalBreakMins = a.breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
      return {
        id: a.id,
        username: a.user.username,
        name: a.user.name,
        role: a.user.role,
        campaignName: a.campaign?.name || "General Floor",
        shiftStartTime: a.campaign?.shiftStartTime || "19:00",
        shiftEndTime: a.campaign?.shiftEndTime || "04:00",
        loginAt: a.loginAt.toISOString(),
        logoutAt: a.logoutAt ? a.logoutAt.toISOString() : null,
        status: a.status,
        isOnBreak: !!activeBreak,
        activeBreakType: activeBreak ? activeBreak.breakType : null,
        totalBreakMinutes: totalBreakMins,
        netProductiveMinutes: a.totalMinutes,
      };
    });
  } catch {
    // Database offline fallback
  }

  // Offline Dev Fallback: Return actual active attendances created during testing
  return devAttendances.map((a) => {
    const activeBreak = a.breaks.find((b) => b.endTime === null);
    const totalBreakMins = a.breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
    const user = getStoredUser(a.userId) || { username: "staff", name: "Staff Member", role: "AGENT" };
    return {
      id: a.id,
      username: user.username,
      name: user.name,
      role: user.role,
      campaignName: a.campaignId || "General Floor",
      shiftStartTime: "19:00",
      shiftEndTime: "04:00",
      loginAt: a.loginAt.toISOString(),
      logoutAt: a.logoutAt ? a.logoutAt.toISOString() : null,
      status: a.status,
      isOnBreak: !!activeBreak,
      activeBreakType: activeBreak ? activeBreak.breakType : null,
      totalBreakMinutes: totalBreakMins,
      netProductiveMinutes: a.totalMinutes,
    };
  });
}

// 8. Auto Logout Expired Shifts Server Action (Manual / Scheduled Trigger)
export async function autoLogoutExpiredShiftsAction(): Promise<{ success: boolean; count: number; message: string }> {
  const session = await getSession();
  if (!session) return { success: false, count: 0, message: "Unauthorized" };

  const count = await autoLogoutExpiredShifts();
  return {
    success: true,
    count,
    message: count > 0 ? `Auto-logged out ${count} expired shift(s) after 04:00 AM.` : "No expired shifts requiring auto-logout.",
  };
}

export interface StaffAttendanceSummary {
  userId: string;
  name: string;
  username: string;
  role: string;
  teamName: string;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  lateMarks: number;
  totalShiftHours: number;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  currentShiftStatus: string;
}

export interface SingleEmployeeAttendanceStats {
  userId: string;
  name: string;
  username: string;
  role: string;
  teamName: string;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  lateMarks: number;
  totalShiftHours: number;
  dailyLogs: Array<{
    date: string;
    dayName: string;
    status: string;
    loginAt: string;
    logoutAt: string | null;
    productiveMins: number;
    breakMins: number;
  }>;
}

export interface AttendanceDashboardSummary {
  totalStaffEnrolled: number;
  totalShiftsRecorded: number;
  onDutyCount: number;
  onBreakCount: number;
  completedTodayCount: number;
  lateTodayCount: number;
  globalShiftStartTime: string;
  globalShiftEndTime: string;
  selectedUserId?: string;
  selectedMonth?: string;
  availableMonths: Array<{ value: string; label: string }>;
  allStaffList: Array<{ id: string; name: string; username: string; role: string }>;
  singleEmployeeStats?: SingleEmployeeAttendanceStats | null;
  staffSummaries: StaffAttendanceSummary[];
  recentShiftLogs: Array<{
    id: string;
    username: string;
    name: string;
    role: string;
    campaignName: string;
    shiftDate: string;
    loginAt: string;
    logoutAt: string | null;
    status: string;
    isOnBreak: boolean;
    activeBreakType: string | null;
    totalBreakMinutes: number;
    netProductiveMinutes: number;
  }>;
}

// 9. Comprehensive Attendance Dashboard Summary Action with Single Employee & Month Filtering
export async function getAttendanceDashboardSummaryAction(
  filterUserId = "ALL",
  filterMonth = "ALL"
): Promise<AttendanceDashboardSummary> {
  const session = await getSession();
  if (session && session.role !== "ADMIN") throw new Error("Unauthorized");

  // Ensure expired shifts are closed
  await autoLogoutExpiredShifts();

  let shiftStartTime = "19:00";
  let shiftEndTime = "04:00";

  const availableMonths = [
    { value: "ALL", label: "All Months (Lifetime)" },
    { value: "2026-08", label: "August 2026 (Aug.xlsx Imported)" },
    { value: "2026-09", label: "September 2026 (Active Roster)" },
  ];

  try {
    const startSetting = await prisma.systemSetting.findUnique({ where: { key: "global_shift_start_time" } });
    const endSetting = await prisma.systemSetting.findUnique({ where: { key: "global_shift_end_time" } });
    if (startSetting?.value) shiftStartTime = startSetting.value;
    if (endSetting?.value) shiftEndTime = endSetting.value;

    // Date range filter
    let monthStart: Date | null = null;
    let monthEnd: Date | null = null;
    if (filterMonth === "2026-08") {
      monthStart = new Date("2026-08-01T00:00:00.000Z");
      monthEnd = new Date("2026-08-31T23:59:59.999Z");
    } else if (filterMonth === "2026-09") {
      monthStart = new Date("2026-09-01T00:00:00.000Z");
      monthEnd = new Date("2026-09-30T23:59:59.999Z");
    }

    const staffUsers = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      include: {
        team: true,
        attendances: {
          where: monthStart && monthEnd ? { shiftDate: { gte: monthStart, lte: monthEnd } } : undefined,
          orderBy: { loginAt: "desc" },
          include: { breaks: true, campaign: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const allStaffList = staffUsers.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
    }));

    const totalAttendanceCount = await prisma.attendance.count({
      where: monthStart && monthEnd ? { shiftDate: { gte: monthStart, lte: monthEnd } } : undefined,
    });

    // Staff Aggregates
    let staffSummaries: StaffAttendanceSummary[] = staffUsers.map((u) => {
      const present = u.attendances.filter((a) => a.status === "PRESENT").length;
      const half = u.attendances.filter((a) => a.status === "HALF_DAY").length;
      const absent = u.attendances.filter((a) => a.status === "ABSENT").length;
      const late = u.attendances.filter((a) => a.status === "LATE").length;
      const totalMins = u.attendances.reduce((sum, a) => sum + a.totalMinutes, 0);
      const latest = u.attendances[0] || null;

      let currentStatus = "Offline";
      if (latest && !latest.logoutAt) {
        const hasBreak = latest.breaks.some((b) => b.endTime === null);
        currentStatus = hasBreak ? "On Break" : "On Duty";
      } else if (latest?.logoutAt) {
        currentStatus = "Completed";
      }

      return {
        userId: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        teamName: u.team?.name || "General Floor",
        presentDays: present,
        halfDays: half,
        absentDays: absent,
        lateMarks: late,
        totalShiftHours: Math.round((totalMins / 60) * 10) / 10,
        lastLoginAt: latest?.loginAt ? latest.loginAt.toISOString() : null,
        lastLogoutAt: latest?.logoutAt ? latest.logoutAt.toISOString() : null,
        currentShiftStatus: currentStatus,
      };
    });

    // Single Employee detailed breakdown if an employee is specifically selected
    let singleEmployeeStats: SingleEmployeeAttendanceStats | null = null;
    if (filterUserId && filterUserId !== "ALL") {
      const targetUser = staffUsers.find((u) => u.id === filterUserId || u.username.toLowerCase() === filterUserId.toLowerCase());
      if (targetUser) {
        const present = targetUser.attendances.filter((a) => a.status === "PRESENT").length;
        const half = targetUser.attendances.filter((a) => a.status === "HALF_DAY").length;
        const absent = targetUser.attendances.filter((a) => a.status === "ABSENT").length;
        const late = targetUser.attendances.filter((a) => a.status === "LATE").length;
        const totalMins = targetUser.attendances.reduce((sum, a) => sum + a.totalMinutes, 0);

        const dailyLogs = targetUser.attendances.map((a) => {
          const shiftDateObj = new Date(a.shiftDate);
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const dayName = days[shiftDateObj.getUTCDay()];
          const breakMins = a.breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
          return {
            date: a.shiftDate.toISOString().split("T")[0],
            dayName,
            status: a.status,
            loginAt: a.loginAt.toISOString(),
            logoutAt: a.logoutAt ? a.logoutAt.toISOString() : null,
            productiveMins: a.totalMinutes,
            breakMins,
          };
        });

        singleEmployeeStats = {
          userId: targetUser.id,
          name: targetUser.name,
          username: targetUser.username,
          role: targetUser.role,
          teamName: targetUser.team?.name || "General Floor",
          presentDays: present,
          halfDays: half,
          absentDays: absent,
          lateMarks: late,
          totalShiftHours: Math.round((totalMins / 60) * 10) / 10,
          dailyLogs,
        };

        // Also prioritize / isolate this user in staffSummaries
        staffSummaries = staffSummaries.filter((s) => s.userId === targetUser.id);
      }
    }

    // Recent shift logs
    const whereRecent: any = {};
    if (monthStart && monthEnd) {
      whereRecent.shiftDate = { gte: monthStart, lte: monthEnd };
    }
    if (filterUserId && filterUserId !== "ALL") {
      whereRecent.userId = filterUserId;
    }

    const recentLogs = await prisma.attendance.findMany({
      where: Object.keys(whereRecent).length > 0 ? whereRecent : undefined,
      take: filterUserId !== "ALL" ? 100 : 50,
      orderBy: { loginAt: "desc" },
      include: {
        user: true,
        campaign: true,
        breaks: true,
      },
    });

    const recentShiftLogs = recentLogs.map((a) => {
      const activeBreak = a.breaks.find((b) => b.endTime === null);
      const totalBreakMins = a.breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
      return {
        id: a.id,
        username: a.user.username,
        name: a.user.name,
        role: a.user.role,
        campaignName: a.campaign?.name || "General Floor",
        shiftDate: a.shiftDate.toISOString().split("T")[0],
        loginAt: a.loginAt.toISOString(),
        logoutAt: a.logoutAt ? a.logoutAt.toISOString() : null,
        status: a.status,
        isOnBreak: !!activeBreak,
        activeBreakType: activeBreak ? activeBreak.breakType : null,
        totalBreakMinutes: totalBreakMins,
        netProductiveMinutes: a.totalMinutes,
      };
    });

    const openFloorShifts = await prisma.attendance.findMany({
      where: { logoutAt: null },
      include: { breaks: true },
    });
    const onDutyCount = openFloorShifts.filter((r) => !r.breaks.some((b) => b.endTime === null)).length;
    const onBreakCount = openFloorShifts.filter((r) => r.breaks.some((b) => b.endTime === null)).length;
    const lateTodayCount = openFloorShifts.filter((r) => r.status === "LATE").length;
    const completedTodayCount = recentShiftLogs.filter((r) => !!r.logoutAt).length;

    return {
      totalStaffEnrolled: staffUsers.length,
      totalShiftsRecorded: totalAttendanceCount,
      onDutyCount,
      onBreakCount,
      completedTodayCount,
      lateTodayCount,
      globalShiftStartTime: shiftStartTime,
      globalShiftEndTime: shiftEndTime,
      selectedUserId: filterUserId,
      selectedMonth: filterMonth,
      availableMonths,
      allStaffList,
      singleEmployeeStats,
      staffSummaries,
      recentShiftLogs,
    };
  } catch {
    // Dev fallback
    return {
      totalStaffEnrolled: 12,
      totalShiftsRecorded: devAttendances.length,
      onDutyCount: 0,
      onBreakCount: 0,
      completedTodayCount: 0,
      lateTodayCount: 0,
      globalShiftStartTime: shiftStartTime,
      globalShiftEndTime: shiftEndTime,
      selectedUserId: filterUserId,
      selectedMonth: filterMonth,
      availableMonths,
      allStaffList: [],
      singleEmployeeStats: null,
      staffSummaries: [],
      recentShiftLogs: [],
    };
  }
}

// 9b. Personal Attendance Record for Logged-In Employee
export async function getMyAttendanceSummaryAction(
  filterMonth = "2026-08"
): Promise<{
  summary: SingleEmployeeAttendanceStats | null;
  availableMonths: Array<{ value: string; label: string }>;
}> {
  const session = await getSession();
  const availableMonths = [
    { value: "2026-08", label: "August 2026 (Aug.xlsx Imported)" },
    { value: "2026-09", label: "September 2026 (Active)" },
    { value: "ALL", label: "All Months" },
  ];

  if (!session) return { summary: null, availableMonths };

  try {
    let monthStart: Date | null = null;
    let monthEnd: Date | null = null;
    if (filterMonth === "2026-08") {
      monthStart = new Date("2026-08-01T00:00:00.000Z");
      monthEnd = new Date("2026-08-31T23:59:59.999Z");
    } else if (filterMonth === "2026-09") {
      monthStart = new Date("2026-09-01T00:00:00.000Z");
      monthEnd = new Date("2026-09-30T23:59:59.999Z");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        team: true,
        attendances: {
          where: monthStart && monthEnd ? { shiftDate: { gte: monthStart, lte: monthEnd } } : undefined,
          orderBy: { shiftDate: "desc" },
          include: { breaks: true },
        },
      },
    });

    if (!user) return { summary: null, availableMonths };

    const present = user.attendances.filter((a) => a.status === "PRESENT").length;
    const half = user.attendances.filter((a) => a.status === "HALF_DAY").length;
    const absent = user.attendances.filter((a) => a.status === "ABSENT").length;
    const late = user.attendances.filter((a) => a.status === "LATE").length;
    const totalMins = user.attendances.reduce((sum, a) => sum + a.totalMinutes, 0);

    const dailyLogs = user.attendances.map((a) => {
      const shiftDateObj = new Date(a.shiftDate);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = days[shiftDateObj.getUTCDay()];
      const breakMins = a.breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
      return {
        date: a.shiftDate.toISOString().split("T")[0],
        dayName,
        status: a.status,
        loginAt: a.loginAt.toISOString(),
        logoutAt: a.logoutAt ? a.logoutAt.toISOString() : null,
        productiveMins: a.totalMinutes,
        breakMins,
      };
    });

    return {
      summary: {
        userId: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        teamName: user.team?.name || "General Floor",
        presentDays: present,
        halfDays: half,
        absentDays: absent,
        lateMarks: late,
        totalShiftHours: Math.round((totalMins / 60) * 10) / 10,
        dailyLogs,
      },
      availableMonths,
    };
  } catch {
    return { summary: null, availableMonths };
  }
}

// 10. Edit Auto Shift End Time Action
export async function updateAutoShiftEndTimeAction(
  newShiftEndTime: string,
  newShiftStartTime = "19:00",
  lateGraceMinutes = 15
): Promise<{ success?: boolean; error?: string; message?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const endClean = newShiftEndTime.trim();
  const startClean = newShiftStartTime.trim();

  if (!/^\d{2}:\d{2}$/.test(endClean)) {
    return { error: "Invalid shift end time. Format must be HH:MM (e.g. 04:00, 04:30, 05:00)." };
  }
  if (!/^\d{2}:\d{2}$/.test(startClean)) {
    return { error: "Invalid shift start time. Format must be HH:MM (e.g. 19:00, 20:00)." };
  }

  try {
    await prisma.systemSetting.upsert({
      where: { key: "global_shift_end_time" },
      update: { value: endClean },
      create: { key: "global_shift_end_time", value: endClean },
    });
    await prisma.systemSetting.upsert({
      where: { key: "global_shift_start_time" },
      update: { value: startClean },
      create: { key: "global_shift_start_time", value: startClean },
    });

    await prisma.campaign.updateMany({
      data: {
        shiftStartTime: startClean,
        shiftEndTime: endClean,
        lateGraceMinutes: Number(lateGraceMinutes) || 15,
      },
    });

    // Run auto-logout evaluation immediately
    await autoLogoutExpiredShifts();

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Auto Shift End Time updated to ${endClean} (Shift: ${startClean} - ${endClean}). All active campaigns and rosters synchronized.`,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to update shift times." };
  }
}


