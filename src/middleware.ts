import { NextResponse, type NextRequest } from "next/server";

/**
 * The Workflow Architect app has no login yet (see src/lib/auth.ts), so on Vercel
 * its pages and APIs are hidden behind a 404 and only the Bloom AI landing page is
 * public. Set ENABLE_WORKFLOW_APP=true once real auth is in place.
 * Local development (no VERCEL_ENV) is unaffected.
 * The engine demo APIs are public by design (they back /demo/* and the embed scripts).
 */
const PUBLIC_DEMO_APIS = ["/api/intent-pulse", "/api/aware-marketing", "/api/aware-infrastructure", "/api/shadow-workforce", "/api/foundry", "/api/chat", "/api/command", "/api/desktop", "/api/license", "/api/settings"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_DEMO_APIS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const onVercel = Boolean(process.env.VERCEL_ENV);
  if (onVercel && process.env.ENABLE_WORKFLOW_APP !== "true") {
    // Rewriting to a route that doesn't exist renders the standard 404 page.
    return NextResponse.rewrite(new URL("/__not-found", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/workspaces/:path*", "/onboarding/:path*", "/api/:path*"],
};
