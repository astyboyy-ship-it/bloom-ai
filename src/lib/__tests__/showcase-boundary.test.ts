import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExchangeSection } from "@/components/bloom/exchange-section";
import { ScoutSection } from "@/components/bloom/scout-section";
import { BrandLogo } from "@/components/pulse/brand-logo";
import { brandOf, COMPANIES, SHOWCASE, withCo } from "@/components/pulse/companies";
import { BriefView } from "@/components/scout/brief-view";
import { FeedCard } from "@/components/scout/feed-card";
import { ILLUSTRATIVE_RUNS } from "@/lib/scout/scenarios";
import { showcaseBuildAllowed } from "@/lib/showcase-gate";

/**
 * The private showcase must never reach the public website. Showcase entities: every real company name and every
 * brand-mark title. Public renders are server renders of the components the website and the /desk routes use.
 */
const ROOT = join(import.meta.dirname, "..", "..", "..");
const SHOWCASE_ENTITIES = ["Tesla", "Spotify", "Palantir", "Shopify", "Builders FirstSource", "Epic Games"];
const FICTIONAL = COMPANIES.map((c) => c.fictional.name);

const clean = (html: string) => {
  for (const name of SHOWCASE_ENTITIES) expect(html, `"${name}" leaked into a public render`).not.toContain(name);
};

describe("showcase build gate", () => {
  const desktop = { NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE: "true", BLOOM_DESKTOP_SHOWCASE: "1" };

  it("allows the showcase only in a local desktop build that asked for it", () => {
    expect(showcaseBuildAllowed(desktop)).toBe(true);
    expect(showcaseBuildAllowed({ ...desktop, NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE: "false" })).toBe(false);
    expect(showcaseBuildAllowed({ NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE: "true" })).toBe(false); // plain next build / dev
  });

  it("is always off on Vercel, whatever the project's variables say", () => {
    expect(showcaseBuildAllowed({ ...desktop, VERCEL: "1" })).toBe(false);
    expect(showcaseBuildAllowed({ ...desktop, VERCEL_ENV: "production" })).toBe(false);
    expect(showcaseBuildAllowed({ ...desktop, VERCEL_ENV: "preview" })).toBe(false);
  });

  it("is wired into the build, and companies.ts reads only the gated value", () => {
    const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");
    expect(config).toMatch(/BLOOM_SHOWCASE_BUILD:\s*showcaseBuildAllowed\(process\.env\)/);
    const companies = readFileSync(join(ROOT, "src/components/pulse/companies.ts"), "utf8");
    expect(companies).toContain('export const SHOWCASE = process.env.BLOOM_SHOWCASE_BUILD === "true";');
    expect(companies).not.toMatch(/NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE\s*===/);
    expect(readFileSync(join(ROOT, "scripts/desktop-local.mjs"), "utf8")).toContain('BLOOM_DESKTOP_SHOWCASE: "1"');
  });
});

describe("public and default renders", () => {
  it("outside a desktop showcase build there is no showcase, even when a caller asks for one", () => {
    expect(SHOWCASE).toBe(false);
    for (const c of COMPANIES) {
      expect(brandOf(c, true)).toBe(c.fictional);
      expect(brandOf(c, true).mark).toBeUndefined();
      expect(withCo("{co}", c, true)).toBe(c.fictional.name);
    }
  });

  it("brand logos render fictional monograms, never a real mark", () => {
    const html = COMPANIES.map((company) => renderToString(createElement(BrandLogo, { company }))).join("");
    clean(html);
    expect(html).not.toContain("<svg");
    for (const c of COMPANIES) expect(html).toContain(c.fictional.monogram ?? c.fictional.name.slice(0, 2).toUpperCase());
  });

  it("the landing page's Bloom Exchange and Bloom Scout sections contain no showcase entity", () => {
    clean(renderToString(createElement(ExchangeSection)) + renderToString(createElement(ScoutSection)));
  });

  it("Bloom Scout's illustrative feed cards and briefs show the fictional companies", () => {
    const html = ILLUSTRATIVE_RUNS.map((run) => renderToString(createElement(FeedCard, { run, onOpenBrief: () => undefined })) + renderToString(createElement(BriefView, { run, onClose: () => undefined }))).join("");
    clean(html);
    expect(html).toContain("Voltara Motors");
    expect(html).toContain("Starforge Interactive");
  });

  it("holds even when the private showcase variable is set in the environment", () => {
    // Vercel production sets NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE; the gate, not that variable, decides.
    expect(showcaseBuildAllowed({ NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE: "true", VERCEL: "1", VERCEL_ENV: "production" })).toBe(false);
    expect(FICTIONAL).toEqual(expect.arrayContaining(["Voltara Motors", "Starforge Interactive"]));
  });
});
