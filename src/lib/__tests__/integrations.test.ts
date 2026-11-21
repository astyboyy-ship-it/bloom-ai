import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXCHANGE_SCOUT_COPY } from "@/components/bloom/exchange-scout-copy";
import { brandOf, COMPANIES, companyById, withCo } from "@/components/pulse/companies";
import { isDesktopRuntime } from "@/components/pulse/use-desktop";
import { ARCHITECTURES } from "@/lib/architectures";
import { AGENTS } from "@/lib/engines";
import { INTEGRATIONS, statusesOf, type IntegrationNode, type L10n, type Product } from "@/lib/integrations";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PRODUCTS: Product[] = ["exchange", "scout"];
const REAL = ["tesla", "epic games", "spotify", "palantir", "shopify", "builders firstsource"];

const texts = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === "string") out.push(v);
  else if (typeof v === "function") out.push(String((v as (...a: string[]) => unknown)("$1", "$2")));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => texts(x, out));
  return out;
};
const shape = (v: unknown, p = "$", out: string[] = []): string[] => {
  if (typeof v === "function") out.push(`${p}:fn${v.length}`);
  else if (Array.isArray(v)) v.forEach((x, i) => shape(x, `${p}[${i}]`, out));
  else if (v && typeof v === "object") for (const k of Object.keys(v).sort()) shape((v as Record<string, unknown>)[k], `${p}.${k}`, out);
  else out.push(`${p}:${typeof v}`);
  return out;
};
const l10ns = (n: IntegrationNode): L10n[] => (n.group === "architectures" ? [] : [...(n.group === "platform" ? [n.name] : []), ...n.points.flatMap((p) => [p.upgrade, p.mechanics]), ...(n.group === "engines" && n.skipped ? [n.skipped] : [])]);

describe("integration map", () => {
  it.each(PRODUCTS)("%s: every engine and every architecture appears exactly once", (product) => {
    const nodes = INTEGRATIONS[product];
    expect(nodes.filter((n) => n.group === "engines").map((n) => n.id).sort()).toEqual(Object.keys(AGENTS).sort());
    expect(nodes.filter((n) => n.group === "architectures").map((n) => n.id).sort()).toEqual(ARCHITECTURES.map((a) => a.slug).sort());
  });

  it.each(PRODUCTS)("%s: every cited file exists in the repository", (product) => {
    const missing = INTEGRATIONS[product].flatMap((n) => (n.group === "architectures" ? [] : n.points.flatMap((p) => p.where))).filter((w) => !existsSync(join(ROOT, w)));
    expect(missing).toEqual([]);
  });

  it.each(PRODUCTS)("%s: every named engine tool is registered on that engine", (product) => {
    for (const n of INTEGRATIONS[product]) {
      if (n.group !== "engines") continue;
      for (const p of n.points) if (p.tool) expect(AGENTS[n.id].tools.map((t) => t.name)).toContain(p.tool);
    }
  });

  it.each(PRODUCTS)("%s: an engine is either used (with points) or skipped (with a reason), never both", (product) => {
    for (const n of INTEGRATIONS[product]) {
      if (n.group !== "engines") continue;
      expect(Boolean(n.points.length) !== Boolean(n.skipped)).toBe(true);
      expect(statusesOf(n)[0] === "skipped").toBe(!n.points.length);
    }
  });

  it.each(PRODUCTS)("%s: architectures carry a product only through engine tools in their own chain", (product) => {
    const engines = Object.fromEntries(INTEGRATIONS[product].filter((n) => n.group === "engines").map((n) => [n.id, n]));
    for (const n of INTEGRATIONS[product]) {
      if (n.group !== "architectures") continue;
      const chain = ARCHITECTURES.find((a) => a.slug === n.id)!.engines;
      for (const v of n.via) {
        expect(chain).toContain(v.engine);
        const e = engines[v.engine];
        expect(e.group === "engines" && e.points.some((p) => p.tool === v.tool && p.status === v.status)).toBe(true);
      }
    }
  });

  it("the derived architecture coverage is what the engine chains imply", () => {
    const via = (p: Product, slug: string) => (INTEGRATIONS[p].find((n) => n.group === "architectures" && n.id === slug) as Extract<IntegrationNode, { group: "architectures" }>).via.map((v) => v.tool);
    expect(via("exchange", "retention-churn-shield").sort()).toEqual(["exchange_commit_terms", "exchange_verify_receipt"]);
    expect(via("exchange", "autonomous-outbound-engine")).toEqual([]);
    expect(via("scout", "post-sale-expansion-suite").sort()).toEqual(["exchange_payload_policy", "handoff_gap_detect"]);
    expect(via("scout", "inbound-signal-collector")).toEqual([]);
  });

  it.each(PRODUCTS)("%s: every text exists in English, Spanish and Hebrew", (product) => {
    for (const t of INTEGRATIONS[product].flatMap(l10ns)) for (const lang of ["en", "es", "he"] as const) expect(t[lang].trim().length).toBeGreaterThan(10);
  });
});

describe("landing copy", () => {
  it("has the same shape in all three languages, with no empty strings", () => {
    const en = shape(EXCHANGE_SCOUT_COPY.en);
    for (const lang of ["es", "he"] as const) {
      expect(shape(EXCHANGE_SCOUT_COPY[lang])).toEqual(en);
      for (const s of texts(EXCHANGE_SCOUT_COPY[lang])) expect(s.trim().length).toBeGreaterThan(0);
    }
  });

  it("never names a real company: not in the copy, the integration map or the section components", () => {
    const sources = ["src/components/bloom/exchange-section.tsx", "src/components/bloom/scout-section.tsx", "src/components/bloom/integration-explorer.tsx", "src/components/bloom/exchange-scout-copy.ts", "src/lib/integrations.ts"].map((f) => readFileSync(join(ROOT, f), "utf8"));
    const all = [...texts(EXCHANGE_SCOUT_COPY), ...texts(INTEGRATIONS), ...sources].join("\n").toLowerCase();
    for (const b of REAL) expect(all).not.toContain(b);
  });

  it("makes no acquisition pitch", () => {
    const all = texts(EXCHANGE_SCOUT_COPY).join("\n").toLowerCase();
    for (const w of ["acquisition", "acquire", "acquirer", "buyout", "exit"]) expect(all).not.toContain(w);
  });
});

describe("desktop-only brand gate", () => {
  it("is never on outside the desktop app: server and tests see no Tauri runtime", () => {
    expect(isDesktopRuntime()).toBe(false);
  });

  it("brandOf and withCo default to the fictional companies whatever the build flag says", () => {
    expect(brandOf(companyById("auto")!).name).toBe("Voltara Motors");
    expect(brandOf(companyById("games")!).name).toBe("Starforge Interactive");
    for (const c of COMPANIES) {
      expect(brandOf(c)).toBe(c.fictional);
      expect(withCo("{co} runs on Bloom", c)).toBe(`${c.fictional.name} runs on Bloom`);
    }
  });
});
