import type { PageFacts } from "@/lib/foundry/crawl";
import { audit, briefFacts, buildPrototype, qa, type Finding, type Qa, type Target } from "./foundry";

/**
 * The five-agent pipeline (crawl → audit → plan → build → QA), shared by the full Foundry and the
 * simple app. Callers render progress from the callbacks; `alive` lets a newer run cancel this one.
 */

export type AgentId = "crawler" | "auditor" | "architect" | "builder" | "qa";
export type Status = "queued" | "working" | "done" | "failed";
export type Line = { agent: AgentId; text: string; tone?: "ok" | "warn" | "err" };

export const AGENTS: { id: AgentId; label: string; role: string }[] = [
  { id: "crawler", label: "Crawler", role: "Fetches the live page" },
  { id: "auditor", label: "Auditor", role: "Finds the bottlenecks" },
  { id: "architect", label: "Architect", role: "Plans the fix" },
  { id: "builder", label: "Builder", role: "Writes the prototype" },
  { id: "qa", label: "QA", role: "Checks it before delivery" },
];

export type RunHooks = {
  alive: () => boolean;
  status: (agent: AgentId, s: Status) => void;
  line: (l: Line) => void;
  finding: (f: Finding) => void;
  code: (partial: string) => void;
  /** Multiplies every simulated wait (1 = default pacing). The crawl itself is a real request and is unaffected. */
  pace?: number;
};

export type RunResult = { facts: PageFacts; findings: Finding[]; html: string; checks: Qa[]; note: string } | null;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runSwarm(target: Omit<Target, "id"> & { spec?: string }, h: RunHooks): Promise<RunResult> {
  const sleep = (ms: number) => pause(ms * (h.pace ?? 1));
  const say = (agent: AgentId, text: string, tone?: Line["tone"]) => h.alive() && h.line({ agent, text, tone });
  const set = (agent: AgentId, s: Status) => h.alive() && h.status(agent, s);

  set("crawler", "working");
  let facts: PageFacts;
  if (target.kind === "url") {
    say("crawler", `GET ${target.input}`);
    try {
      const res = await fetch("/api/foundry/crawl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: target.input }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Crawl failed.");
      facts = json.facts as PageFacts;
      say("crawler", `${facts.status} · ${facts.ms} ms · ${Math.round(facts.bytes / 1024)} KB · ${facts.scripts} scripts · ${facts.images} images`, "ok");
      say("crawler", `Title “${facts.title.slice(0, 70)}” · ${facts.h1.length} H1 · ${facts.forms} forms · ${facts.ctas.length} CTAs`);
      if (facts.analytics.length || facts.booking.length || facts.chat.length) say("crawler", `Detected: ${[...facts.analytics, ...facts.booking, ...facts.chat].join(", ")}`);
      say("crawler", `Brand: ${facts.themeColor || facts.colors[0] || "no colour found"} · type: ${facts.fonts.length ? facts.fonts.join(", ") : "system fonts"}`);
      set("crawler", "done");
    } catch (err) {
      say("crawler", err instanceof Error ? err.message : "Crawl failed.", "err");
      set("crawler", "failed");
      return null;
    }
  } else {
    await sleep(400);
    facts = briefFacts(target);
    say("crawler", target.kind === "handle" ? `${target.input}: social profile, no owned page to crawl. Working from the handle${target.spec ? " and your spec" : ""}.` : "No URL given. Working from the written bottleneck.", "warn");
    set("crawler", "done");
  }
  if (!h.alive()) return null;

  set("auditor", "working");
  const findings = audit(facts, target);
  for (const f of findings) {
    await sleep(260);
    if (!h.alive()) return null;
    h.finding(f);
    say("auditor", `[${f.severity}] ${f.title} · ${f.evidence}`, f.severity === "high" ? "err" : "warn");
  }
  if (target.spec) say("auditor", `Spec from the vault: “${target.spec.slice(0, 120)}”`);
  set("auditor", "done");

  set("architect", "working");
  await sleep(350);
  say("architect", `Fix pack: ${[...new Set(findings.map((f) => f.fix))].join(" · ")}`);
  say("architect", "Self-contained HTML so the target can open it anywhere: no install, no tracking scripts.");
  set("architect", "done");

  set("builder", "working");
  const html = buildPrototype(target, facts, findings);
  const step = Math.ceil(html.length / 45);
  for (let i = step; i < html.length + step; i += step) {
    if (!h.alive()) return null;
    h.code(html.slice(0, i));
    await sleep(40);
  }
  say("builder", `${html.split("\n").length} lines · ${Math.round(new Blob([html]).size / 1024)} KB · qualifier form, instant booking, tracked CTAs`, "ok");
  set("builder", "done");

  set("qa", "working");
  await sleep(300);
  const checks = qa(html);
  const failed = checks.filter((c) => !c.pass);
  say("qa", failed.length ? `${failed.length} check(s) failed: ${failed.map((c) => c.label).join("; ")}` : `All ${checks.length} checks passed`, failed.length ? "warn" : "ok");
  set("qa", failed.length ? "failed" : "done");

  const note = `Hi ${target.name} team,\n\nI noticed ${findings[0] ? findings[0].title.toLowerCase() : "a gap in your funnel"}${findings[0] && target.kind === "url" ? ` (${findings[0].evidence.toLowerCase()})` : ""}. Rather than pitch you, I built the fix: ${[...new Set(findings.map((f) => f.fix.toLowerCase()))].slice(0, 3).join(", ")}.\n\nIt's a working prototype you can click through right now: [link]\n\nIf it's useful, I can wire it into your stack this week. If not, keep it.\n`;
  return { facts, findings, html, checks, note };
}
