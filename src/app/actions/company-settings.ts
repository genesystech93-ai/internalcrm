"use server";

import { getSession } from "@/lib/auth";
import { sanitizeText, validateEmail } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export interface CompanySettings {
  companyName: string;
  brandName: string;
  tagline: string;
  supportEmail: string;
  phone: string;
  headquarters: string;
  website: string;
  registrationNumber: string;
  hasCustomLogo: boolean;
  logoUrl: string;
}

import { inMemorySettingsStore } from "@/lib/company-store";

// Default fallback settings
const defaultSettings: CompanySettings = {
  companyName: "Genesoft Infotech Private Limited",
  brandName: "Genesoft Infotech",
  tagline: "Enterprise Sales Floor & Campaign Operations CRM",
  supportEmail: "operations@genesoftinfotech.com",
  phone: "+1 (888) 436-3763",
  headquarters: "Level 4, Infotech Towers, Silicon Corridor",
  website: "https://genesoftinfotech.com",
  registrationNumber: "GEN-INF-2026-BPO",
  hasCustomLogo: false,
  logoUrl: "/api/logo",
};

export async function getCompanySettingsAction(): Promise<CompanySettings> {
  let settings = { ...defaultSettings };

  try {
    // 1. Fetch persistent company profile from database
    const profileSetting = await prisma.systemSetting.findUnique({
      where: { key: "company_profile" },
    });
    if (profileSetting && profileSetting.value) {
      try {
        const parsed = JSON.parse(profileSetting.value);
        settings = { ...settings, ...parsed };
      } catch {
        // Ignore parse error
      }
    }

    // 2. Check if logo exists in database
    const logoSetting = await prisma.systemSetting.findUnique({
      where: { key: "company_logo" },
    });
    if (logoSetting && logoSetting.value) {
      settings.hasCustomLogo = true;
      settings.logoUrl = "/api/logo";
      return settings;
    }
  } catch (err) {
    console.warn("Could not query database for company settings, checking cache/disk fallback...", err);
  }

  // 3. Cache fallback check
  if (inMemorySettingsStore.has("company_logo")) {
    settings.hasCustomLogo = true;
    settings.logoUrl = "/api/logo";
    return settings;
  }

  // 4. Disk fallback check
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    await fs.access(logoPath);
    settings.hasCustomLogo = true;
    settings.logoUrl = "/api/logo";
  } catch {
    settings.hasCustomLogo = false;
  }

  return settings;
}

export async function updateCompanySettingsAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Administrator authority required." };
  }

  const companyName = sanitizeText(formData.get("companyName"), 100);
  const brandName = sanitizeText(formData.get("brandName"), 60);
  const tagline = sanitizeText(formData.get("tagline"), 150);
  const rawEmail = formData.get("supportEmail");
  const phone = sanitizeText(formData.get("phone"), 30);
  const headquarters = sanitizeText(formData.get("headquarters"), 200);
  const website = sanitizeText(formData.get("website"), 100);
  const registrationNumber = sanitizeText(formData.get("registrationNumber"), 50);

  const emailVal = validateEmail(rawEmail);
  if (!emailVal.valid) {
    return { error: "Please provide a valid support email address." };
  }

  const updatedProfile = {
    companyName: companyName || defaultSettings.companyName,
    brandName: brandName || defaultSettings.brandName,
    tagline: tagline || defaultSettings.tagline,
    supportEmail: emailVal.value,
    phone: phone || defaultSettings.phone,
    headquarters: headquarters || defaultSettings.headquarters,
    website: website || defaultSettings.website,
    registrationNumber: registrationNumber || defaultSettings.registrationNumber,
  };

  try {
    await prisma.systemSetting.upsert({
      where: { key: "company_profile" },
      update: { value: JSON.stringify(updatedProfile) },
      create: { key: "company_profile", value: JSON.stringify(updatedProfile) },
    });
  } catch (err) {
    console.error("Failed to persist company profile to database:", err);
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/login");

  return { success: true, message: "Company profile details updated successfully." };
}

export async function uploadCompanyLogoAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Administrator authority required." };
  }

  const file = formData.get("logoFile") as File | null;
  if (!file || file.size === 0) {
    return { error: "No image file was provided for upload." };
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return { error: "File size exceeds 5MB limit. Please upload an optimized image." };
  }

  // Validate MIME type
  const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
  if (!allowedMimes.includes(file.type)) {
    return { error: "Invalid file type. Allowed formats: PNG, JPG, JPEG, SVG, WEBP." };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Defense-in-depth: Scan SVG uploads for malicious script tags or event handlers
    if (file.type === "image/svg+xml") {
      const svgText = buffer.toString("utf-8");
      if (/<script\b|javascript:|onload=|onerror=|onclick=/i.test(svgText)) {
        return {
          error: "Security Alert: Uploaded SVG contains embedded scripts or event handlers. Please upload a clean image.",
        };
      }
    }

    // 1. Convert to Base64 data URL for storage
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64Data}`;

    // 2. Store in memory cache
    inMemorySettingsStore.set("company_logo", dataUrl);

    // 3. Write to public/logo.png as disk fallback
    try {
      const publicDir = path.join(process.cwd(), "public");
      const logoFilePath = path.join(publicDir, "logo.png");
      await fs.writeFile(logoFilePath, buffer);
    } catch {
      // Best-effort disk write
    }

    // 4. Persist to database
    let dbPersisted = false;
    try {
      await prisma.systemSetting.upsert({
        where: { key: "company_logo" },
        update: { value: dataUrl },
        create: { key: "company_logo", value: dataUrl },
      });
      dbPersisted = true;
    } catch (dbErr) {
      console.warn("Database storage warning for logo (saved to memory & disk cache):", dbErr);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    revalidatePath("/login");

    return {
      success: true,
      message: dbPersisted
        ? "Official Company Logo uploaded and applied across CRM!"
        : "Company Logo uploaded and active across CRM (Cached Storage).",
    };
  } catch (err: unknown) {
    console.error("Failed to process logo upload:", err);
    return { error: "Failed to process logo. Please try a different image format (PNG, JPG, SVG)." };
  }
}

export async function removeCompanyLogoAction() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Administrator authority required." };
  }

  try {
    inMemorySettingsStore.delete("company_logo");

    try {
      await prisma.systemSetting.deleteMany({
        where: { key: "company_logo" },
      });
    } catch {
      // Best effort DB delete
    }

    // Best-effort remove from disk
    try {
      const logoFilePath = path.join(process.cwd(), "public", "logo.png");
      await fs.unlink(logoFilePath);
    } catch {
      // Ignore
    }

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    revalidatePath("/login");

    return { success: true, message: "Company logo removed. Monogram fallback restored." };
  } catch (err) {
    console.error("Failed to remove logo:", err);
    return { error: "Failed to remove logo." };
  }
}
