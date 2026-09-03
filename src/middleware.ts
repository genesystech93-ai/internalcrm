import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getJwtSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL: NEXTAUTH_SECRET is not set in production.");
  }
  return new TextEncoder().encode(secret || "genesoft-crm-dev-only-key-not-for-production");
}

const SECRET_KEY = getJwtSecret();

const SESSION_COOKIE_NAME = "genesoft_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let sessionUser: { role?: string; userId?: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      sessionUser = payload as { role?: string; userId?: string };
    } catch {
      sessionUser = null;
    }
  }

  // Redirect logged-in users away from /login
  if (pathname === "/login" && sessionUser) {
    if (sessionUser.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    if (!sessionUser) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (sessionUser.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Protect /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!sessionUser) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/login"],
};
