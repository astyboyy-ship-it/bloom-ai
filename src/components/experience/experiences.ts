import { BLOOM_ACCENTS, type BloomLicensePayload } from "@/lib/licensing/types";

/**
 * The key → experience matrix. Every activated key resolves to exactly one workspace experience from its role
 * and, for demo partner keys, its demoTarget. `accent` is the experience's signature color, which the signed
 * key's own themeConfig.accentColor matches for the standard suite (see scripts/generate-all-keys.ts); the
 * theme always binds to the key's color, so a custom-accented key keeps its own color.
 */
export type ExperienceId = "standard" | "operator" | "agency" | "enterprise" | "eval" | "demo_general" | "demo_music" | "demo_trading" | "demo_coreops";

export const EXPERIENCE_ACCENT: Record<ExperienceId, string> = {
  standard: BLOOM_ACCENTS.cyan,
  operator: BLOOM_ACCENTS.cyan,
  agency: BLOOM_ACCENTS.emerald,
  enterprise: BLOOM_ACCENTS.amber,
  eval: BLOOM_ACCENTS.softEmerald,
  demo_general: BLOOM_ACCENTS.pink,
  demo_music: BLOOM_ACCENTS.pink,
  demo_trading: BLOOM_ACCENTS.amber,
  demo_coreops: BLOOM_ACCENTS.cyan,
};

export function resolveExperience(access: BloomLicensePayload | null): ExperienceId {
  if (!access) return "standard";
  switch (access.role) {
    case "operator":
    case "agency":
    case "enterprise":
    case "eval":
      return access.role;
    case "demo_partner":
      switch (access.permissions.demoTarget) {
        case "music":
          return "demo_music";
        case "trading":
          return "demo_trading";
        case "coreops":
          return "demo_coreops";
        // IntentPulse has no dedicated view: it opens in the general demo, on its own target.
        default:
          return "demo_general";
      }
  }
}
