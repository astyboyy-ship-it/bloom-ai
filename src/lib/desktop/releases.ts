/**
 * Where the desktop installers come from, and how a visitor's click turns into a file download.
 *
 * Sources, in order of precedence:
 *   1. DESKTOP_DOWNLOAD_WINDOWS_URL / DESKTOP_DOWNLOAD_MAC_URL: direct public URLs (a CDN, Blob storage...).
 *   2. The latest GitHub release of DESKTOP_RELEASES_REPO (owner/name), as published by
 *      .github/workflows/desktop.yml. Public repo: visitors get the asset's normal download URL.
 *      Private repo: set GITHUB_TOKEN (read-only "Contents" access to that repo) and each click is
 *      exchanged server-side for GitHub's short-lived signed URL. The token never reaches the browser,
 *      and the file streams from GitHub, not through this server.
 *
 * Kept free of Next.js imports so it can be exercised from a plain script.
 */

export type DesktopOs = "windows" | "mac";

export type ReleaseAsset = { id: number; name: string; size: number; browser_download_url: string };
type Release = { tag_name: string; name: string | null; published_at: string | null; html_url: string; assets: ReleaseAsset[] };

export type DesktopConfig = { repo?: string; token?: string; direct: Partial<Record<DesktopOs, string>> };

/**
 * Installer names per OS, best first. Windows: x64 before ARM (most PCs), NSIS setup before MSI. Mac: the
 * universal .dmg (our workflow's output, runs on both chips), then Apple silicon, then anything. Signatures are never served.
 */
const PATTERNS: Record<DesktopOs, RegExp[]> = {
  windows: [/(x64|x86_64|amd64).*-setup\.exe$/i, /-setup\.exe$/i, /(x64|x86_64|amd64).*\.msi$/i, /\.exe$/i, /\.msi$/i],
  mac: [/universal\.dmg$/i, /(aarch64|arm64).*\.dmg$/i, /\.dmg$/i],
};

export const DEFAULT_RELEASES_REPO = "astyboyy-ship-it/bloom-ai";

export function desktopConfig(env: Record<string, string | undefined> = process.env): DesktopConfig {
  const repo = (env.DESKTOP_RELEASES_REPO?.trim() || DEFAULT_RELEASES_REPO).replace(/^https:\/\/github\.com\//, "").replace(/\/$/, "");
  return {
    repo: /^[\w.-]+\/[\w.-]+$/.test(repo) ? repo : undefined,
    token: env.GITHUB_TOKEN?.trim() || undefined,
    direct: { windows: env.DESKTOP_DOWNLOAD_WINDOWS_URL?.trim() || undefined, mac: env.DESKTOP_DOWNLOAD_MAC_URL?.trim() || undefined },
  };
}

const ghHeaders = (token?: string, accept = "application/vnd.github+json"): Record<string, string> => ({
  Accept: accept,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "bloom-ai-desktop-downloads",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/** The latest published release, or null when there is none (or the repo isn't visible with this token). */
export async function latestRelease(cfg: DesktopConfig, init: RequestInit & { next?: { revalidate: number } } = {}): Promise<Release | null> {
  if (!cfg.repo) return null;
  const res = await fetch(`https://api.github.com/repos/${cfg.repo}/releases/latest`, { ...init, headers: ghHeaders(cfg.token) });
  if (!res.ok) return null;
  return (await res.json()) as Release;
}

export function pickAsset(release: Release | null, os: DesktopOs): ReleaseAsset | null {
  for (const re of PATTERNS[os]) {
    const asset = release?.assets.find((a) => re.test(a.name) && !a.name.endsWith(".sig"));
    if (asset) return asset;
  }
  return null;
}

/**
 * The URL to send a visitor to for this asset. With a token, GitHub answers the asset API with a redirect to a
 * signed URL that works without auth for a few minutes; we hand the visitor that redirect target.
 */
export async function assetDownloadUrl(cfg: DesktopConfig, asset: ReleaseAsset): Promise<string | null> {
  if (!cfg.token) return asset.browser_download_url;
  const res = await fetch(`https://api.github.com/repos/${cfg.repo}/releases/assets/${asset.id}`, {
    headers: ghHeaders(cfg.token, "application/octet-stream"),
    redirect: "manual",
    cache: "no-store",
  });
  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location) return location;
  return null;
}

/** What /download shows: which installers exist right now, without exposing any URL. */
export type ReleaseSummary = {
  version: string | null;
  publishedAt: string | null;
  installers: Record<DesktopOs, { name: string; size: number } | null>;
};

export async function releaseSummary(cfg: DesktopConfig, init?: RequestInit & { next?: { revalidate: number } }): Promise<ReleaseSummary> {
  const release = cfg.direct.windows && cfg.direct.mac ? null : await latestRelease(cfg, init).catch(() => null);
  const describe = (os: DesktopOs) => {
    if (cfg.direct[os]) return { name: cfg.direct[os]!.split("/").pop() ?? os, size: 0 };
    const a = pickAsset(release, os);
    return a ? { name: a.name, size: a.size } : null;
  };
  return {
    version: release?.tag_name.replace(/^desktop-v/, "") ?? null,
    publishedAt: release?.published_at ?? null,
    installers: { windows: describe("windows"), mac: describe("mac") },
  };
}
