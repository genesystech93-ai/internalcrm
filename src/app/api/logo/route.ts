import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "company_logo" },
    });

    if (!setting || !setting.value) {
      return new NextResponse(null, { status: 404 });
    }

    // Format: data:<mime>;base64,<data>
    const match = setting.value.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return new NextResponse(null, { status: 404 });
    }

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
  } catch (err) {
    console.error("Error serving logo from database:", err);
    return new NextResponse(null, { status: 404 });
  }
}
