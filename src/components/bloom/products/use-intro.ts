"use client";

import { useCallback, useEffect, useState } from "react";

/** How long the painting holds before it lifts: long enough for the 3D garden to grow and bloom. */
export const INTRO_HOLD_MS = 5600;

/**
 * The intro plays over the product on the same URL, then unmounts. `?intro=0` (the product's own
 * header link) opens straight into the app. `fast` is set when the viewer skips, so the exit is instant.
 */
export function useIntro(holdMs = INTRO_HOLD_MS) {
  const [phase, setPhase] = useState<"playing" | "leaving" | "done">("playing");
  const [fast, setFast] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("intro") === "0") return setPhase("done");
    const t = setTimeout(() => setPhase((p) => (p === "playing" ? "leaving" : p)), holdMs);
    return () => clearTimeout(t);
  }, [holdMs]);
  const skip = useCallback(() => {
    setFast(true);
    setPhase((p) => (p === "done" ? p : "leaving"));
  }, []);
  const exited = useCallback(() => setPhase("done"), []);
  return { show: phase !== "done", leaving: phase === "leaving", fast, skip, exited };
}
