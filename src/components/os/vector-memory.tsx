"use client";

import { useMemo, useState } from "react";
import { Database, Eraser, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, isEngineKey, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { can } from "@/components/desk/rbac";
import { activeMember, audit, setCalibration, updateSettings, useDeskSettings } from "@/components/desk/settings";
import { readCalibration } from "@/lib/engines/calibration";
import { ENGINE_DEMOS } from "./explore-data";
import { OsPage } from "./os-shell";

const DIM = 256;

/** FNV-1a, for feature hashing. */
function hash(s: string, seed = 2166136261) {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/**
 * A local embedding: words, word pairs and character trigrams feature-hashed into signed dimensions,
 * L2-normalized (256 dimensions). Trigrams let "pricing", "price" and "priced" meet; word pairs keep phrases distinct. Texts that
 * share vocabulary land close together, which is enough to inspect and search memory without any model.
 */
export function embed(text: string): number[] {
  const v = new Array<number>(DIM).fill(0);
  const words = text.toLowerCase().match(/[\p{L}\p{N}$%]{3,}/gu) ?? [];
  const add = (g: string, w: number) => {
    const h = hash(g);
    v[h % DIM] += h & 0x80000000 ? -w : w;
  };
  for (const w of words) {
    add(w, 1);
    for (let i = 0; i + 3 <= w.length; i++) add(`#${w.slice(i, i + 3)}`, 0.5);
  }
  for (let i = 1; i < words.length; i++) add(`${words[i - 1]} ${words[i]}`, 0.7);
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}
const cosine = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

// A fixed random projection to 2D, seeded so the map is stable between visits.
const PROJ: [number[], number[]] = [0, 1].map((r) => Array.from({ length: DIM }, (_, i) => ((hash(`p${r}-${i}`) / 2 ** 32) * 2 - 1))) as [number[], number[]];

type Item = { id: string; engine: EngineKey; text: string; tier: "long" | "short"; at?: number; index?: number; v: number[] };

/** /desk/vector-memory: inspect, search, filter, clear or seed the agents' memory. */
export function VectorMemory() {
  const { settings } = useDeskSettings();
  const mayEdit = can(activeMember(settings).role, "calibrate");
  const [engine, setEngine] = useState<EngineKey | "all">("all");
  const [tier, setTier] = useState<"all" | "long" | "short">("all");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [seedEngine, setSeedEngine] = useState<EngineKey>("apex");
  const [seedText, setSeedText] = useState("");

  const items = useMemo<Item[]>(() => {
    const long = ENGINE_ORDER.flatMap((k) => readCalibration(settings.calibrations[k]).memory.map((text, index) => ({ id: `l-${k}-${index}`, engine: k, text, tier: "long" as const, index, v: embed(text) })));
    const since = Date.now() - 86_400_000;
    const short = settings.runs
      .filter((r) => r.at >= since && r.summary)
      .map((r) => ({ id: `s-${r.runId}`, engine: (isEngineKey(r.target) ? r.target : "sovereign") as EngineKey, text: `${r.label}: ${r.summary}`, tier: "short" as const, at: r.at, v: embed(`${r.command} ${r.summary}`) }));
    return [...long, ...short];
  }, [settings.calibrations, settings.runs]);

  const qv = useMemo(() => (query.trim() ? embed(query) : null), [query]);
  const visible = items.filter((i) => (engine === "all" || i.engine === engine) && (tier === "all" || i.tier === tier));
  const ranked = qv ? [...visible].map((i) => ({ i, score: cosine(qv, i.v) })).sort((a, b) => b.score - a.score) : visible.map((i) => ({ i, score: 0 }));
  const top = new Set(qv ? ranked.slice(0, 5).map((r) => r.i.id) : []);

  const pts = useMemo(() => {
    const raw = items.map((i) => ({ id: i.id, x: cosine(PROJ[0], i.v), y: cosine(PROJ[1], i.v) }));
    const xs = raw.map((p) => p.x);
    const ys = raw.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs, -0.1), Math.max(...xs, 0.1), Math.min(...ys, -0.1), Math.max(...ys, 0.1)];
    return Object.fromEntries(raw.map((p) => [p.id, { x: 30 + ((p.x - x0) / (x1 - x0)) * 540, y: 20 + ((p.y - y0) / (y1 - y0)) * 280 }]));
  }, [items]);

  const pick = items.find((i) => i.id === picked);
  const neighbours = pick ? items.filter((i) => i.id !== pick.id).map((i) => ({ i, score: cosine(pick.v, i.v) })).sort((a, b) => b.score - a.score).slice(0, 3) : [];

  const forget = (it: Item) => {
    if (it.tier !== "long" || it.index === undefined) return;
    const raw = settings.calibrations[it.engine] ?? {};
    setCalibration(it.engine, { ...raw, memory: readCalibration(raw).memory.filter((_, j) => j !== it.index) });
    audit("calibration", `Removed a memory from ${ENGINES[it.engine].name}`);
    setPicked(null);
  };
  const seed = (k: EngineKey, text: string) => {
    const raw = settings.calibrations[k] ?? {};
    setCalibration(k, { ...raw, memory: [...readCalibration(raw).memory, text.slice(0, 800)].slice(-10) });
  };

  return (
    <OsPage kicker="Vector memory · context inspector" title="What the agents remember" lede="Long-term memory is each engine's retained results, sent back as context on its next run; short-term is the last 24 hours of runs. Embeddings here are computed locally (256-d feature hashing over words and character trigrams), not by a model, so search is lexical rather than semantic.">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-lg border border-os-line bg-os-panel/80 px-3 py-2">
          <Search className="size-4 text-os-cyan" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search across memory, e.g. 'discount pricing pressure'" aria-label="Search memory" className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 focus:outline-none" />
        </label>
        <select value={engine} onChange={(e) => setEngine(e.target.value as EngineKey | "all")} aria-label="Engine filter" className="rounded-lg border border-os-line bg-os-panel px-3 py-2 text-[12.5px] text-white">
          <option value="all">All engines</option>
          {ENGINE_ORDER.map((k) => (
            <option key={k} value={k}>
              {ENGINES[k].name}
            </option>
          ))}
        </select>
        <div role="radiogroup" aria-label="Memory tier" className="flex rounded-lg border border-os-line p-0.5">
          {(["all", "long", "short"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tier === t} onClick={() => setTier(t)} className={cn("rounded-md px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em]", tier === t ? "bg-os-cyan/15 text-os-cyan" : "text-white/50")}>
              {t === "all" ? "All" : t === "long" ? "Long-term" : "Short-term"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <section className="os-panel rounded-2xl p-3">
          <div className="flex items-center justify-between px-1">
            <p className="os-label">Embedding space · 2D projection</p>
            <p className="font-mono text-[10.5px] text-white/40">{visible.length} vectors · ● long-term ○ short-term</p>
          </div>
          <svg viewBox="0 0 600 320" className="mt-2 h-auto w-full" style={{ direction: "ltr" }} role="group" aria-label="Memory embedding map">
            {[0.25, 0.5, 0.75].map((f) => (
              <g key={f}>
                <line x1={600 * f} y1={0} x2={600 * f} y2={320} stroke="rgb(0 240 255 / 0.06)" />
                <line x1={0} y1={320 * f} x2={600} y2={320 * f} stroke="rgb(0 240 255 / 0.06)" />
              </g>
            ))}
            {pick && neighbours.map(({ i }) => pts[i.id] && <line key={i.id} x1={pts[pick.id].x} y1={pts[pick.id].y} x2={pts[i.id].x} y2={pts[i.id].y} stroke="#00f0ff" strokeOpacity={0.45} strokeDasharray="3 4" />)}
            {items.map((i) => {
              const p = pts[i.id];
              const shown = visible.includes(i);
              const c = PALETTES[i.engine].c1;
              return (
                <circle
                  key={i.id}
                  cx={p.x}
                  cy={p.y}
                  r={top.has(i.id) || picked === i.id ? 8 : 5.5}
                  fill={i.tier === "long" ? c : "transparent"}
                  stroke={c}
                  strokeWidth={top.has(i.id) ? 2.5 : 1.5}
                  opacity={shown ? (qv && !top.has(i.id) ? 0.3 : 0.95) : 0.08}
                  onClick={() => setPicked(i.id)}
                  className="cursor-pointer transition-[r,opacity]"
                >
                  <title>{`${ENGINES[i.engine].name}: ${i.text.slice(0, 80)}`}</title>
                </circle>
              );
            })}
            {items.length === 0 && (
              <text x={300} y={160} textAnchor="middle" fontSize={13} fill="rgb(255 255 255 / 0.4)">
                No memory yet. Seed some context, or complete a run.
              </text>
            )}
          </svg>
        </section>

        <section className="space-y-4">
          <div className="os-panel rounded-2xl p-4">
            <p className="os-label flex items-center gap-2">
              <Database className="size-3.5 text-os-cyan" /> Inspector
            </p>
            {pick ? (
              <div style={paletteVars(PALETTES[pick.engine])} className="mt-2">
                <p className="font-mono text-[10.5px] text-c-2">
                  {ENGINES[pick.engine].name} · {pick.tier === "long" ? "long-term" : "short-term"}
                  {pick.at ? ` · ${new Date(pick.at).toLocaleString()}` : ""}
                </p>
                <p dir="auto" className="mt-1.5 text-[13px] leading-relaxed text-white/85">{pick.text}</p>
                <p className="mt-3 os-label">Nearest neighbours</p>
                <ul className="mt-1 space-y-1">
                  {neighbours.map(({ i, score }) => (
                    <li key={i.id}>
                      <button type="button" onClick={() => setPicked(i.id)} className="flex w-full gap-2 text-start text-[12px] text-white/60 hover:text-white">
                        <span className="font-mono text-os-cyan">{score.toFixed(2)}</span>
                        <span className="truncate">{i.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {pick.tier === "long" && (
                  <button type="button" disabled={!mayEdit} onClick={() => forget(pick)} className="mt-3 flex items-center gap-1.5 text-[12px] text-red-300/80 hover:text-red-300 disabled:opacity-40">
                    <Trash2 className="size-3.5" /> Forget this memory
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[12.5px] text-white/40">Click a point to inspect it and its nearest neighbours.</p>
            )}
          </div>

          <div className="os-panel rounded-2xl p-4">
            <p className="os-label flex items-center gap-2">
              <Plus className="size-3.5 text-os-cyan" /> Seed context into an engine
            </p>
            <fieldset disabled={!mayEdit} className="mt-2 space-y-2 disabled:opacity-50">
              <select value={seedEngine} onChange={(e) => setSeedEngine(e.target.value as EngineKey)} aria-label="Engine to seed" className="w-full rounded-lg border border-os-line bg-os-panel px-3 py-2 text-[12.5px] text-white">
                {ENGINE_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {ENGINES[k].name}
                  </option>
                ))}
              </select>
              <textarea value={seedText} onChange={(e) => setSeedText(e.target.value)} rows={2} placeholder="e.g. Acme Corp prefers annual prepay; never discount below 12%." className="w-full resize-none rounded-lg border border-os-line bg-black/40 p-2.5 text-[12.5px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none" />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!seedText.trim()}
                  onClick={() => {
                    seed(seedEngine, seedText.trim());
                    audit("calibration", `Seeded memory into ${ENGINES[seedEngine].name}`);
                    setSeedText("");
                  }}
                  className="rounded-full border border-os-cyan/40 px-3 py-1.5 text-[12px] text-os-cyan disabled:opacity-40"
                >
                  Seed memory
                </button>
                <button
                  type="button"
                  onClick={() => {
                    ENGINE_ORDER.forEach((k) => seed(k, ENGINE_DEMOS[k].output));
                    audit("calibration", "Seeded synthetic memory into all 8 engines");
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-os-line px-3 py-1.5 text-[12px] text-white/70 hover:text-white"
                >
                  <Sparkles className="size-3.5" /> Seed synthetic set
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targets = engine === "all" ? ENGINE_ORDER : [engine];
                    if (!window.confirm(`Clear long-term memory for ${engine === "all" ? "all engines" : ENGINES[engine].name}?`)) return;
                    updateSettings((s) => ({ calibrations: Object.fromEntries(Object.entries(s.calibrations).map(([k, v]) => [k, targets.includes(k as EngineKey) ? { ...v, memory: [] } : v])) }));
                    audit("calibration", `Cleared long-term memory for ${engine === "all" ? "all engines" : ENGINES[engine].name}`);
                    setPicked(null);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-red-400/30 px-3 py-1.5 text-[12px] text-red-200 hover:bg-red-500/10"
                >
                  <Eraser className="size-3.5" /> Clear {engine === "all" ? "all" : ENGINES[engine].name}
                </button>
              </div>
            </fieldset>
          </div>
        </section>
      </div>

      <section className="os-panel mt-4 rounded-2xl p-4">
        <p className="os-label">{qv ? "Search results · ranked by cosine similarity" : "Memory entries"}</p>
        <ul className="mt-2 divide-y divide-os-line/60">
          {ranked.slice(0, 12).map(({ i, score }) => (
            <li key={i.id} style={paletteVars(PALETTES[i.engine])} className="flex items-start gap-3 py-2">
              <span className="w-24 shrink-0 font-mono text-[10.5px] text-c-2">{ENGINES[i.engine].name}</span>
              <span className="w-16 shrink-0 font-mono text-[10px] uppercase text-white/35">{i.tier}</span>
              <button type="button" onClick={() => setPicked(i.id)} dir="auto" className="min-w-0 flex-1 text-start text-[12.5px] text-white/75 hover:text-white">
                {i.text}
              </button>
              {qv && <span className="font-mono text-[11px] text-os-cyan">{score.toFixed(2)}</span>}
            </li>
          ))}
          {ranked.length === 0 && <li className="py-4 text-[12.5px] text-white/40">Nothing matches these filters.</li>}
        </ul>
      </section>
    </OsPage>
  );
}
