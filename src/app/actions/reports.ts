"use server";
// Genesoft Infotech CRM - Performance Reports & Analytics Engine

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { listStoredUsers, getStoredUser } from "@/lib/user-store";
import { getDevAttendances } from "@/app/actions/attendance";
import { getDevLeads } from "@/app/actions/leads";

export interface EmployeePerformanceItem {
  userId: string;
  name: string;
  username: string;
  role: string;
  teamName: string;
  totalLeads: number;
  approvedSales: number;
  rejectedCount: number;
  callbacksCount: number;
  conversionRate: number;
  earnedCommissions: number;
  totalShiftHours: number;
  lateArrivals: number;
}

export interface LeadExportItem {
  id: string;
  customerName: string;
  dob: string;
  mobile: string;
  email: string;
  address: string;
  campaign: string;
  source: string;
  closerName: string;
  agentName: string;
  agentUsername: string;
  status: string;
  callBackTime: string;
  rejectionReason: string;
  approvedAt: string;
  notes: string;
  createdAt: string;
}

export async function getEmployeePerformanceReportAction(): Promise<EmployeePerformanceItem[]> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return [];

  try {
    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      include: {
        team: true,
        leads: true,
        incentiveEarnings: true,
        attendances: true,
      },
    });

    return users.map((u) => {
      const total = u.leads.length;
      const approved = u.leads.filter((l) => l.status === "APPROVED").length;
      const rejected = u.leads.filter((l) => l.status === "REJECTED").length;
      const callbacks = u.leads.filter((l) => l.status === "CALL_BACK").length;
      const conversionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

      const earned = u.incentiveEarnings
        .filter((e) => e.status === "ACCRUED" || e.status === "PAID")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const totalMins = u.attendances.reduce((sum, a) => sum + a.totalMinutes, 0);
      const lateCount = u.attendances.filter((a) => a.status === "LATE").length;

      return {
        userId: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        teamName: u.team?.name || "General Floor",
        totalLeads: total,
        approvedSales: approved,
        rejectedCount: rejected,
        callbacksCount: callbacks,
        conversionRate,
        earnedCommissions: earned,
        totalShiftHours: Math.round((totalMins / 60) * 10) / 10,
        lateArrivals: lateCount,
      };
    });
  } catch {
    // Database offline fallback
  }

  // Offline Dev Fallback: Compute performance metrics dynamically for all actual workforce users
  const staff = listStoredUsers().filter((u) => u.role === "AGENT" || u.role === "CLOSER" || u.role === "TL");
  const attendances = await getDevAttendances();
  const leads = await getDevLeads();

  return staff.map((u) => {
    const userLeads = leads.filter((l) => l.agentId === u.id || l.agentUsername === u.username);
    const approved = userLeads.filter((l) => l.status === "APPROVED").length;
    const rejected = userLeads.filter((l) => l.status === "REJECTED").length;
    const callbacks = userLeads.filter((l) => l.status === "CALL_BACK").length;
    const conversionRate = userLeads.length > 0 ? Math.round((approved / userLeads.length) * 100) : 0;
    const earned = approved * 15.0; // Dynamic commission calculation

    const userAttendances = attendances.filter((a) => a.userId === u.id);
    const totalMins = userAttendances.reduce((sum, a) => sum + (a.totalMinutes || 0), 0);
    const lateCount = userAttendances.filter((a) => a.status === "LATE").length;

    return {
      userId: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      teamName: u.campaignName || "General Floor",
      totalLeads: userLeads.length,
      approvedSales: approved,
      rejectedCount: rejected,
      callbacksCount: callbacks,
      conversionRate,
      earnedCommissions: earned,
      totalShiftHours: Math.round((totalMins / 60) * 10) / 10,
      lateArrivals: lateCount,
    };
  });
}

export async function getFullLeadsExportAction(): Promise<LeadExportItem[]> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return [];

  try {
    const leads = await prisma.lead.findMany({
      include: {
        agent: true,
        campaign: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (leads.length > 0) {
      return leads.map((l) => ({
        id: l.id,
        customerName: l.customerName,
        dob: l.dob.toISOString().split("T")[0],
        mobile: l.mobile,
        email: l.email,
        address: l.address.replace(/"/g, '""'),
        campaign: l.campaign.name,
        source: l.source,
        closerName: l.closerName,
        agentName: l.agent.name,
        agentUsername: l.agent.username,
        status: l.status,
        callBackTime: l.callBackTime ? l.callBackTime.toISOString() : "N/A",
        rejectionReason: l.rejectionReason || "N/A",
        approvedAt: l.approvedAt ? l.approvedAt.toISOString() : "N/A",
        notes: (l.notes || "").replace(/"/g, '""'),
        createdAt: l.createdAt.toISOString(),
      }));
    }
  } catch {
    // Database offline fallback
  }

  // Offline Dev Fallback: Export actual leads submitted during testing
  const devLeads = await getDevLeads();
  return devLeads.map((l) => ({
    id: l.id,
    customerName: l.customerName,
    dob: l.dob,
    mobile: l.mobile,
    email: l.email,
    address: l.address.replace(/"/g, '""'),
    campaign: l.campaignName,
    source: l.source,
    closerName: l.closerName,
    agentName: l.agentName,
    agentUsername: l.agentUsername,
    status: l.status,
    callBackTime: l.callBackTime || "N/A",
    rejectionReason: l.rejectionReason || "N/A",
    approvedAt: l.approvedAt || "N/A",
    notes: (l.notes || "").replace(/"/g, '""'),
    createdAt: l.createdAt,
  }));
}

export interface LiveTimelineEvent {
  id: string;
  type: "lead_submit" | "lead_approve" | "lead_reject" | "break_start" | "shift_login" | "late_mark" | "leave_apply";
  agent: string;
  description: string;
  time: string;
  campaign?: string;
  timestamp: number;
}

export async function getLiveTimelineAction(): Promise<LiveTimelineEvent[]> {
  const session = await getSession();
  if (!session) return [];

  const events: LiveTimelineEvent[] = [];

  try {
    // 1. Recent Leads
    const recentLeads = await prisma.lead.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: { agent: true, campaign: true },
    });

    for (const lead of recentLeads) {
      const timeStr = new Date(lead.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      events.push({
        id: `lead-sub-${lead.id}`,
        type: "lead_submit",
        agent: lead.agent?.name || "Agent",
        description: `submitted lead "${lead.customerName}"`,
        time: timeStr,
        campaign: lead.campaign?.name,
        timestamp: new Date(lead.createdAt).getTime(),
      });

      if (lead.status === "APPROVED" && lead.approvedAt) {
        const appTime = new Date(lead.approvedAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        events.push({
          id: `lead-app-${lead.id}`,
          type: "lead_approve",
          agent: "Admin",
          description: `approved lead "${lead.customerName}"`,
          time: appTime,
          campaign: lead.campaign?.name,
          timestamp: new Date(lead.approvedAt).getTime(),
        });
      } else if (lead.status === "REJECTED") {
        const rejTime = new Date(lead.updatedAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        events.push({
          id: `lead-rej-${lead.id}`,
          type: "lead_reject",
          agent: "Admin",
          description: `rejected lead "${lead.customerName}"${lead.rejectionReason ? ` — ${lead.rejectionReason}` : ""}`,
          time: rejTime,
          campaign: lead.campaign?.name,
          timestamp: new Date(lead.updatedAt).getTime(),
        });
      }
    }

    // 2. Recent Attendance
    const recentAttendances = await prisma.attendance.findMany({
      take: 10,
      orderBy: { loginAt: "desc" },
      include: { user: true, campaign: true, breaks: true },
    });

    for (const att of recentAttendances) {
      const isLate = att.status === "LATE";
      const loginTime = new Date(att.loginAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      events.push({
        id: `att-login-${att.id}`,
        type: isLate ? "late_mark" : "shift_login",
        agent: att.user?.name || "Staff Member",
        description: isLate ? "clocked in late" : "logged into shift",
        time: loginTime,
        campaign: att.campaign?.name,
        timestamp: new Date(att.loginAt).getTime(),
      });

      for (const b of att.breaks) {
        const breakTime = new Date(b.startTime).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        events.push({
          id: `break-${b.id}`,
          type: "break_start",
          agent: att.user?.name || "Staff Member",
          description: `started ${b.breakType.replace(/_/g, " ")} break`,
          time: breakTime,
          campaign: att.campaign?.name,
          timestamp: new Date(b.startTime).getTime(),
        });
      }
    }

    // 3. Recent Leaves
    const recentLeaves = await prisma.leaveRequest.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });

    for (const l of recentLeaves) {
      const leaveTime = new Date(l.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      events.push({
        id: `leave-${l.id}`,
        type: "leave_apply",
        agent: l.user?.name || "Staff Member",
        description: `requested ${l.leaveType.toLowerCase()} leave`,
        time: leaveTime,
        timestamp: new Date(l.createdAt).getTime(),
      });
    }

    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  } catch {
    // Database offline fallback: use devLeads and devAttendances if present
    const devLeads = await getDevLeads();
    const devAtt = await getDevAttendances();

    for (const lead of devLeads) {
      events.push({
        id: `dev-lead-${lead.id}`,
        type: "lead_submit",
        agent: lead.agentName || "Agent",
        description: `submitted lead "${lead.customerName}"`,
        time: lead.createdAt ? new Date(lead.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "Just now",
        campaign: lead.campaignName,
        timestamp: lead.createdAt ? new Date(lead.createdAt).getTime() : Date.now(),
      });
      if (lead.status === "APPROVED") {
        events.push({
          id: `dev-app-${lead.id}`,
          type: "lead_approve",
          agent: "Admin",
          description: `approved lead "${lead.customerName}"`,
          time: "Recently",
          campaign: lead.campaignName,
          timestamp: Date.now(),
        });
      }
    }

    for (const att of devAtt) {
      const user = getStoredUser(att.userId);
      events.push({
        id: `dev-att-${att.id}`,
        type: att.status === "LATE" ? "late_mark" : "shift_login",
        agent: user?.name || "Staff Member",
        description: att.status === "LATE" ? "clocked in late" : "logged into shift",
        time: new Date(att.loginAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        campaign: att.campaignId || undefined,
        timestamp: new Date(att.loginAt).getTime(),
      });
    }

    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  }
}

export interface LiveNotificationItem {
  id: string;
  type: "lead_submitted" | "lead_approved" | "leave_request" | "shift_login" | "late_mark" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
  timestamp: number;
}

export async function getLiveNotificationsAction(): Promise<LiveNotificationItem[]> {
  const session = await getSession();
  if (!session) return [];

  const items: LiveNotificationItem[] = [];

  try {
    // 1. Pending or recent leads
    const recentLeads = await prisma.lead.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { agent: true, campaign: true },
    });

    for (const lead of recentLeads) {
      const timeStr = new Date(lead.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      if (lead.status === "APPROVED") {
        items.push({
          id: `notif-app-${lead.id}`,
          type: "lead_approved",
          title: "Lead Approved",
          message: `Lead "${lead.customerName}" approved — ₹${Number(lead.campaign?.commissionPerLead || 15)} commission`,
          time: lead.approvedAt ? new Date(lead.approvedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : timeStr,
          read: false,
          timestamp: lead.approvedAt ? new Date(lead.approvedAt).getTime() : new Date(lead.createdAt).getTime(),
        });
      } else {
        items.push({
          id: `notif-lead-${lead.id}`,
          type: "lead_submitted",
          title: "New Lead Submitted",
          message: `${lead.agent?.name || "Agent"} submitted lead "${lead.customerName}" (${lead.campaign?.name || "General"})`,
          time: timeStr,
          read: false,
          timestamp: new Date(lead.createdAt).getTime(),
        });
      }
    }

    // 2. Pending leave requests
    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });

    for (const leave of pendingLeaves) {
      items.push({
        id: `notif-leave-${leave.id}`,
        type: "leave_request",
        title: "Leave Request",
        message: `${leave.user?.name || "Staff"} requested ${leave.leaveType.toLowerCase()} leave`,
        time: new Date(leave.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        read: false,
        timestamp: new Date(leave.createdAt).getTime(),
      });
    }

    // 3. Late arrivals
    const lateAtt = await prisma.attendance.findMany({
      where: { status: "LATE" },
      take: 5,
      orderBy: { loginAt: "desc" },
      include: { user: true, campaign: true },
    });

    for (const a of lateAtt) {
      items.push({
        id: `notif-late-${a.id}`,
        type: "late_mark",
        title: "Late Arrival",
        message: `${a.user?.name || "Staff"} clocked in late to ${a.campaign?.name || "shift"}`,
        time: new Date(a.loginAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        read: false,
        timestamp: new Date(a.loginAt).getTime(),
      });
    }

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  } catch {
    // Offline dev fallback: return empty unless dev records exist
    const devLeads = await getDevLeads();
    for (const l of devLeads.slice(0, 5)) {
      items.push({
        id: `dev-notif-${l.id}`,
        type: l.status === "APPROVED" ? "lead_approved" : "lead_submitted",
        title: l.status === "APPROVED" ? "Lead Approved" : "New Lead Submitted",
        message: `${l.agentName || "Agent"} - ${l.customerName} (${l.campaignName})`,
        time: "Just now",
        read: false,
        timestamp: Date.now(),
      });
    }
    return items;
  }
}

