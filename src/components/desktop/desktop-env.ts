"use client";

/**
 * Whether this page is running inside the Bloom AI desktop app. The Tauri shell opens /launch?app=desktop,
 * which sets a session flag; the website then hides its "Download" CTAs (no point offering the app inside it).
 */
const FLAG = "bloom-desktop-app";

export function markDesktopApp() {
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {
    // Storage blocked: the CTAs simply stay visible.
  }
}

export function isDesktopApp() {
  try {
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

export type DesktopOs = "windows" | "mac" | "other";

/** Windows or macOS from the browser, preferring the structured platform hint where it exists. */
export function detectOs(): DesktopOs {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } };
  if (nav.userAgentData?.mobile) return "other";
  const platform = (nav.userAgentData?.platform || nav.platform || "").toLowerCase();
  const ua = nav.userAgent.toLowerCase();
  // iPads report as Mac; a touch-capable "Mac" is a tablet, not a desktop.
  if (/iphone|ipad|android/.test(ua) || (platform.startsWith("mac") && nav.maxTouchPoints > 1)) return "other";
  if (platform.startsWith("win") || ua.includes("windows")) return "windows";
  if (platform.startsWith("mac") || ua.includes("mac os")) return "mac";
  return "other";
}
