import { useCommandCopy } from "@/components/bloom/command/locale";
import { SCOUT_COPY, type ScoutCopy } from "./copy-text";

export * from "./copy-text";

/** Bloom Scout's copy in the desk's current language; components re-render when it changes. */
export function useScoutCopy(): ScoutCopy {
  const { lang } = useCommandCopy();
  return SCOUT_COPY[lang];
}
