import { NextRequest, NextResponse } from "next/server";

const CANONICAL_DOMAIN = "vasanam.in";

/**
 * Redirect non-canonical domains (e.g. vasanam.vercel.app) to vasanam.in.
 * Preserves path, query string, and fragment.
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // Allow canonical domain and localhost (dev) through
  if (
    hostname === CANONICAL_DOMAIN ||
    hostname.startsWith("www." + CANONICAL_DOMAIN) ||
    hostname.startsWith("localhost") ||
    hostname.startsWith("127.0.0.1")
  ) {
    return NextResponse.next();
  }

  // Redirect non-canonical domains (vercel.app, preview URLs, etc.)
  const url = request.nextUrl.clone();
  url.host = CANONICAL_DOMAIN;
  url.protocol = "https";
  url.port = "";

  return NextResponse.redirect(url, 301);
}

export const config = {
  // Run on all paths except static files and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)"],
};
