import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, verifyAccessKey } from "@/lib/licensing/codec";

/**
 * The Workflow Architect app has no login yet (see src/lib/auth.ts), so on Vercel
 * its pages and APIs are hidden behind a 404 and only the Bloom AI landing page is
 * public. Set ENABLE_WORKFLOW_APP=true once real auth is in place.
 * Local development (no VERCEL_ENV) is unaffected.
 * The engine demo APIs are public by design (they back /demo/* and the embed scripts).
 *
 * The Neural Control Plane (/desk/control-plane and its API) is locked to access keys whose signed payload grants
 * accessNeuralControlPlane: the key's HMAC is verified here, on every request, from the httpOnly cookie that
 * /api/license sets on activation. Anything else is sent back to /desk (pages) or refused (API).
 */
const PUBLIC_DEMO_APIS = ["/api/intent-pulse", "/api/aware-marketing", "/api/aware-infrastructure", "/api/shadow-workforce", "/api/foundry", "/api/chat", "/api/command", "/api/desktop", "/api/license", "/api/settings", "/api/pipeline", "/api/exchange"];
const CONTROL_PLANE = "/desk/control-plane";
const CONTROL_PLANE_API = "/api/control-plane";

async function controlPlaneAllowed(req: NextRequest) {
  const v = await verifyAccessKey(req.cookies.get(ACCESS_COOKIE)?.value);
  return v.ok && v.payload.permissions.accessNeuralControlPlane === true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === CONTROL_PLANE || pathname.startsWith(`${CONTROL_PLANE}/`)) {
    if (await controlPlaneAllowed(req)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/desk";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith(CONTROL_PLANE_API)) {
    if (await controlPlaneAllowed(req)) return NextResponse.next();
    return NextResponse.json({ error: { message: "The Neural Control Plane needs an Operator access key." } }, { status: 403 });
  }

  if (PUBLIC_DEMO_APIS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const onVercel = Boolean(process.env.VERCEL_ENV);
  if (onVercel && process.env.ENABLE_WORKFLOW_APP !== "true") {
    // Rewriting to a route that doesn't exist renders the standard 404 page.
    return NextResponse.rewrite(new URL("/__not-found", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/desk/control-plane", "/desk/control-plane/:path*", "/workspaces/:path*", "/onboarding/:path*", "/api/:path*"],
};
