import { describe, expect, it } from "vitest";
import { SCOUT_COPY } from "../copy";

type Tree = unknown;
function shape(v: Tree, path = "$", out: string[] = []): string[] {
  if (typeof v === "function") out.push(`${path}:fn${v.length}`);
  else if (Array.isArray(v)) v.forEach((x, i) => shape(x, `${path}[${i}]`, out));
  else if (v && typeof v === "object") for (const k of Object.keys(v).sort()) shape((v as Record<string, Tree>)[k], `${path}.${k}`, out);
  else out.push(`${path}:${typeof v}`);
  return out;
}
function strings(v: Tree, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (typeof v === "function") {
    const f = v as (...a: unknown[]) => unknown;
    let text: unknown;
    try {
      text = f("$1", "$2", "$3", "$4", "$5");
    } catch {
      text = f(["$1", "$2"]); // the one list-taking string, relay.streams
    }
    out.push(String(text));
  }
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe("Bloom Scout copy", () => {
  it("has the same shape in English, Spanish and Hebrew, with no empty strings", () => {
    const en = shape(SCOUT_COPY.en);
    for (const lang of ["es", "he"] as const) {
      expect(shape(SCOUT_COPY[lang])).toEqual(en);
      for (const s of strings(SCOUT_COPY[lang])) expect(s.trim().length).toBeGreaterThan(0);
    }
  });

  it("labels illustrative entries exactly as specified", () => {
    expect(SCOUT_COPY.en.badges.illustrative).toBe("Illustrative blueprint · not a real deal or real agent");
    expect(SCOUT_COPY.en.badges.example).toBe("example, not on the ledger");
  });

  it("never names a real company in its own text", () => {
    const all = Object.values(SCOUT_COPY).flatMap((c) => strings(c)).join("\n").toLowerCase();
    for (const b of ["tesla", "epic games", "spotify", "palantir", "shopify"]) expect(all).not.toContain(b);
  });
});
