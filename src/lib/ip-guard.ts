import { prisma } from "@/lib/prisma";

// In-memory registry fallback for local development / when PostgreSQL server is offline
let devIpRestrictionEnabled = false;
let devWhitelistedIps = [
  { id: "ip-localhost-1", ipAddress: "127.0.0.1", description: "Localhost IPv4 (Development)", isActive: true },
  { id: "ip-localhost-2", ipAddress: "::1", description: "Localhost IPv6 (Development)", isActive: true },
  { id: "ip-office-lan", ipAddress: "192.168.1.1", description: "Default Gateway / Office LAN", isActive: true },
];

export function normalizeIp(rawIp: string | null | undefined): string {
  if (!rawIp) return "127.0.0.1";
  let ip = rawIp.trim();
  // Handle comma-separated list from x-forwarded-for
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }
  // Strip IPv6-mapped IPv4 prefix
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }
  // Normalize IPv6 loopback to IPv4
  if (ip === "::1") {
    ip = "127.0.0.1";
  }
  return ip;
}

export function extractClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cfConnectingIp = headers.get("cf-connecting-ip");

  const raw = cfConnectingIp || forwardedFor || realIp || "127.0.0.1";
  return normalizeIp(raw);
}

export async function isIpRestrictionActive(): Promise<boolean> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ip_restriction_enabled" },
    });
    if (setting) {
      return setting.value === "true";
    }
  } catch {
    // Database offline fallback
  }
  return devIpRestrictionEnabled;
}

export async function setIpRestrictionActive(enabled: boolean): Promise<void> {
  devIpRestrictionEnabled = enabled;
  try {
    await prisma.systemSetting.upsert({
      where: { key: "ip_restriction_enabled" },
      update: { value: enabled ? "true" : "false" },
      create: { key: "ip_restriction_enabled", value: enabled ? "true" : "false" },
    });
  } catch {
    // Database offline fallback
  }
}

export async function checkIpAuthorization(clientIp: string): Promise<{ authorized: boolean; restrictionEnabled: boolean }> {
  const restrictionActive = await isIpRestrictionActive();
  if (!restrictionActive) {
    return { authorized: true, restrictionEnabled: false };
  }

  const normalized = normalizeIp(clientIp);

  try {
    const record = await prisma.whitelistedIp.findFirst({
      where: {
        ipAddress: normalized,
        isActive: true,
      },
    });
    if (record) {
      return { authorized: true, restrictionEnabled: true };
    }
  } catch {
    // Database offline fallback
  }

  const inDevList = devWhitelistedIps.some(
    (item) => item.isActive && (item.ipAddress === normalized || normalized === "127.0.0.1" || normalized === "::1")
  );

  return { authorized: inDevList, restrictionEnabled: true };
}

export async function isIpAllowed(clientIp: string): Promise<boolean> {
  const res = await checkIpAuthorization(clientIp);
  return res.authorized;
}

export async function getWhitelistedIpsList() {
  try {
    const list = await prisma.whitelistedIp.findMany({
      orderBy: { createdAt: "desc" },
    });
    if (list.length > 0) return list;
  } catch {
    // Database offline fallback
  }
  return devWhitelistedIps;
}

export async function addWhitelistedIp(ipAddress: string, description?: string) {
  const normalized = normalizeIp(ipAddress);
  const newRecord = {
    id: `ip-${Date.now()}`,
    ipAddress: normalized,
    description: description || "Custom Whitelist Entry",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  devWhitelistedIps = [newRecord, ...devWhitelistedIps.filter((i) => i.ipAddress !== normalized)];

  try {
    return await prisma.whitelistedIp.upsert({
      where: { ipAddress: normalized },
      update: { description, isActive: true },
      create: { ipAddress: normalized, description, isActive: true },
    });
  } catch {
    return newRecord;
  }
}

export async function removeWhitelistedIp(id: string) {
  devWhitelistedIps = devWhitelistedIps.filter((i) => i.id !== id);
  try {
    await prisma.whitelistedIp.delete({ where: { id } });
  } catch {
    // Database offline fallback
  }
}

export async function toggleWhitelistedIp(id: string) {
  devWhitelistedIps = devWhitelistedIps.map((i) => (i.id === id ? { ...i, isActive: !i.isActive } : i));
  try {
    const current = await prisma.whitelistedIp.findUnique({ where: { id } });
    if (current) {
      await prisma.whitelistedIp.update({
        where: { id },
        data: { isActive: !current.isActive },
      });
    }
  } catch {
    // Database offline fallback
  }
}
