import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Os = "windows" | "mac";

/** Installer suffixes per OS, best first: the NSIS setup.exe, then an MSI; one universal .dmg for both Mac chips. */
const PATTERNS: Record<Os, RegExp[]> = {
  windows: [/-setup\.exe$/i, /\.exe$/i, /\.msi$/i],
  mac: [/universal\.dmg$/i, /\.dmg$/i],
};

type Release = { assets?: { name: string; browser_download_url: string }[] };

/**
 * Sends the visitor to the right desktop installer. In order:
 *   1. DESKTOP_DOWNLOAD_WINDOWS_URL / DESKTOP_DOWNLOAD_MAC_URL, when set (any public host: a CDN, Blob storage).
 *   2. The matching asset on the latest GitHub release of DESKTOP_RELEASES_REPO (owner/name). The repo must be
 *      public for visitors to download from it; GITHUB_TOKEN only helps the lookup, not the download.
 *   3. Otherwise /download, which says the build for their OS isn't published yet.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const os: Os = url.searchParams.get("os") === "mac" ? "mac" : "windows";

  const direct = (os === "mac" ? process.env.DESKTOP_DOWNLOAD_MAC_URL : process.env.DESKTOP_DOWNLOAD_WINDOWS_URL)?.trim();
  if (direct) return NextResponse.redirect(direct, 302);

  const repo = process.env.DESKTOP_RELEASES_REPO?.trim();
  if (repo && /^[\w.-]+\/[\w.-]+$/.test(repo)) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
        // A new release shows up within five minutes without hitting GitHub's rate limit on every click.
        next: { revalidate: 300 },
      });
      if (res.ok) {
        const release = (await res.json()) as Release;
        for (const re of PATTERNS[os]) {
          const asset = release.assets?.find((a) => re.test(a.name));
          if (asset) return NextResponse.redirect(asset.browser_download_url, 302);
        }
      }
    } catch (err) {
      console.error("[desktop-download] release lookup failed:", err);
    }
  }

  return NextResponse.redirect(new URL(`/download?os=${os}`, url), 302);
}
