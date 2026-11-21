"use client";

import { useSyncExternalStore } from "react";
import { SHOWCASE } from "./companies";

/**
 * Whether this page is running inside the Bloom AI desktop app (a Tauri window), decided at runtime.
 *
 * Tauri v2 injects `__TAURI_INTERNALS__` into every page its webview loads, including the production web deploy the
 * release app opens; an ordinary browser never has it. The server snapshot is always `false`, so server rendering and
 * the first client render agree (no hydration mismatch) and real names can only appear after hydration, in the app.
 */
const noop = () => () => undefined;
export const isDesktopRuntime = (): boolean => typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

export function useDesktop(): boolean {
  return useSyncExternalStore(noop, isDesktopRuntime, () => false);
}

/**
 * The private showcase (real company names and marks) applies only when the build enables it AND the page runs in
 * the desktop app. On the public website it is always off, whatever the build flag says.
 */
export function useShowcase(): boolean {
  const desktop = useDesktop();
  return SHOWCASE && desktop;
}
