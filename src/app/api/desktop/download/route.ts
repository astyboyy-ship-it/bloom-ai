import { NextResponse } from "next/server";
import { assetDownloadUrl, desktopConfig, latestRelease, pickAsset, type DesktopOs } from "@/lib/desktop/releases";

export const dynamic = "force-dynamic";

/**
 * Sends the visitor straight to the right desktop installer (see src/lib/desktop/releases.ts for sources).
 * When no installer is published for their OS yet, they land on /download, which says so.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const os: DesktopOs = url.searchParams.get("os") === "mac" ? "mac" : "windows";
  const cfg = desktopConfig();

  const direct = cfg.direct[os];
  if (direct) return NextResponse.redirect(direct, 302);

  try {
    // Release metadata is cached for five minutes; the signed URL below is minted fresh on every click.
    const asset = pickAsset(await latestRelease(cfg, { next: { revalidate: 300 } }), os);
    const target = asset && (await assetDownloadUrl(cfg, asset));
    if (target) return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[desktop-download] release lookup failed:", err);
  }

  return NextResponse.redirect(new URL(`/download?os=${os}`, url), 302);
}
