"use server";

import { getSession } from "@/lib/auth";
import { sanitizeText, validateEmail } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";
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

// In-memory / persistent config fallback
let currentSettings: CompanySettings = {
  companyName: "Genesoft Infotech Private Limited",
  brandName: "Genesoft Infotech",
  tagline: "Enterprise Sales Floor & Campaign Operations CRM",
  supportEmail: "operations@genesoftinfotech.com",
  phone: "+1 (888) 436-3763",
  headquarters: "Level 4, Infotech Towers, Silicon Corridor",
  website: "https://genesoftinfotech.com",
  registrationNumber: "GEN-INF-2026-BPO",
  hasCustomLogo: false,
  logoUrl: "/logo.png",
};

export async function getCompanySettingsAction(): Promise<CompanySettings> {
  // Check if logo.png exists on filesystem
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    await fs.access(logoPath);
    currentSettings.hasCustomLogo = true;
  } catch {
    currentSettings.hasCustomLogo = false;
  }
  return currentSettings;
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

  currentSettings = {
    ...currentSettings,
    companyName: companyName || currentSettings.companyName,
    brandName: brandName || currentSettings.brandName,
    tagline: tagline || currentSettings.tagline,
    supportEmail: emailVal.value,
    phone: phone || currentSettings.phone,
    headquarters: headquarters || currentSettings.headquarters,
    website: website || currentSettings.website,
    registrationNumber: registrationNumber || currentSettings.registrationNumber,
  };

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
        return { error: "Security Alert: Uploaded SVG contains embedded scripts or event handlers. Please upload a clean image." };
      }
    }

    const publicDir = path.join(process.cwd(), "public");
    const logoFilePath = path.join(publicDir, "logo.png");

    await fs.writeFile(logoFilePath, buffer);
    currentSettings.hasCustomLogo = true;

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/login");

    return { success: true, message: "Official Company Logo uploaded and applied across CRM!" };
  } catch (err: unknown) {
    console.error("Failed to write logo file:", err);
    return { error: "Failed to save logo to disk. Please check server permissions." };
  }
}

export async function removeCompanyLogoAction() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Administrator authority required." };
  }

  try {
    const logoFilePath = path.join(process.cwd(), "public", "logo.png");
    await fs.unlink(logoFilePath);
    currentSettings.hasCustomLogo = false;

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/login");

    return { success: true, message: "Company logo removed. Monogram fallback restored." };
  } catch {
    currentSettings.hasCustomLogo = false;
    return { success: true, message: "Company logo reset to default monogram." };
  }
}
