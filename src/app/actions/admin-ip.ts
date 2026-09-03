"use server";

import { getSession } from "@/lib/auth";
import {
  isIpRestrictionActive,
  setIpRestrictionActive,
  getWhitelistedIpsList,
  addWhitelistedIp,
  removeWhitelistedIp,
  toggleWhitelistedIp,
  extractClientIp,
} from "@/lib/ip-guard";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { validateIpAddress, sanitizeText } from "@/lib/sanitize";

export async function getIpStatusAction() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const reqHeaders = await headers();
  const currentClientIp = extractClientIp(reqHeaders);
  const isRestricted = await isIpRestrictionActive();
  const ips = await getWhitelistedIpsList();

  return {
    currentClientIp,
    isRestricted,
    whitelistedIps: ips,
  };
}

export async function toggleIpRestrictionAction(enable: boolean) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin role required." };
  }

  await setIpRestrictionActive(enable);
  revalidatePath("/admin");
  return {
    success: true,
    message: enable ? "IP Restriction is now ENFORCED." : "IP Restriction is now DISABLED.",
  };
}


export async function addWhitelistedIpAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin role required." };
  }

  const rawIp = formData.get("ipAddress");
  const rawDesc = formData.get("description");

  const ipVal = validateIpAddress(rawIp);
  if (!ipVal.valid) {
    return { error: ipVal.error || "Please enter a valid IPv4 or IPv6 address." };
  }

  const ipAddress = ipVal.value;
  const description = sanitizeText(rawDesc, 100);

  await addWhitelistedIp(ipAddress, description);
  revalidatePath("/admin");
  return { success: true, message: `IP ${ipAddress} added to whitelist.` };
}

export async function deleteWhitelistedIpAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin role required." };
  }

  await removeWhitelistedIp(id);
  revalidatePath("/admin");
  return { success: true, message: "Whitelisted IP entry removed." };
}

export async function toggleWhitelistedIpAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin role required." };
  }

  await toggleWhitelistedIp(id);
  revalidatePath("/admin");
  return { success: true, message: "IP status updated." };
}
