import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inMemorySettingsStore } from "@/lib/company-store";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Try serving from database
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "company_logo" },
    });

    if (setting && setting.value) {
      const match = setting.value.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const imageBuffer = Buffer.from(base64Data, "base64");

        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": imageBuffer.length.toString(),
            "Cache-Control": "public, max-age=60, stale-while-revalidate=3600",
          },
        });
      }
    }
  } catch (err) {
    console.warn("Could not query database in /api/logo, falling back to cache/disk:", err);
  }

  // 2. Try serving from memory cache
  const cachedDataUrl = inMemorySettingsStore.get("company_logo");
  if (cachedDataUrl) {
    const match = cachedDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const base64Data = match[2];
      const imageBuffer = Buffer.from(base64Data, "base64");
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": imageBuffer.length.toString(),
          "Cache-Control": "public, max-age=60",
        },
      });
    }
  }

  // 3. Try serving from disk (public/logo.png)
  try {
    const logoFilePath = path.join(process.cwd(), "public", "logo.png");
    const diskBuffer = await fs.readFile(logoFilePath);
    return new NextResponse(diskBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": diskBuffer.length.toString(),
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
