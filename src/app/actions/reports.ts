"use server";
// Genesoft Infotech CRM - Performance Reports & Analytics Engine

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { listStoredUsers } from "@/lib/user-store";
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
      where: { role: { in: ["AGENT", "TL"] } },
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
