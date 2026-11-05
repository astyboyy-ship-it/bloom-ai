"use client";

import { useMemo, useState } from "react";
import { GitBranch, GitCommitHorizontal, GitFork, History, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { commitMemory, forkMemory, rollbackMemory, useDeskSettings, verifySnapshots, type MemorySnapshot } from "@/components/desk/settings";
import { embed } from "@/components/os/vector-memory";
import { useLicensingCopy } from "./copy";
import { CpButton, Widget } from "./widget";

const ROW = 30;
const LANE = 18;
const LANE_COLORS = ["var(--bloom-accent)", "#00FF88", "#FFB000", "#FF007A", "#a78bfa", "#8ff8ff"];

const cosine = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

/**
 * Temporal Vector Tree: an engine's memory snapshots drawn as a git graph, one lane per branch. Each snapshot's
 * memory is embedded locally into 256 dimensions (the same feature hashing as Vector Memory), so the tree shows
 * how far each commit drifted from its parent, and the selected commit's vector renders as a 16×16 field.
 * Commit, fork and rollback write through the same hash-chained store the rest of the desk uses.
 */
export function VectorTree() {
  const c = useLicensingCopy().cp.tree;
  const { settings } = useDeskSettings();
  const [engine, setEngine] = useState<EngineKey>(() => ENGINE_ORDER.find((k) => settings.memorySnapshots.some((s) => s.engine === k)) ?? "sovereign");
  const [selected, setSelected] = useState<string | null>(null);
  const [forking, setForking] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [scenario, setScenario] = useState("");

  const snaps = useMemo(() => settings.memorySnapshots.filter((s) => s.engine === engine).sort((a, b) => a.at - b.at), [settings.memorySnapshots, engine]);
  const broken = useMemo(() => new Set(verifySnapshots(settings.memorySnapshots)), [settings.memorySnapshots]);
  const headId = settings.memoryHeads[engine];
  const sel = snaps.find((s) => s.id === selected) ?? snaps.find((s) => s.id === headId) ?? snaps.at(-1) ?? null;

  // Lanes in order of first appearance, so main stays leftmost.
  const lanes = useMemo(() => [...new Set(snaps.map((s) => s.branch))], [snaps]);
  const vectors = useMemo(() => new Map(snaps.map((s) => [s.id, embed(s.memory.join("\n") || " ")])), [snaps]);
  const drift = (s: MemorySnapshot) => {
    if (!s.parent) return null;
    const a = vectors.get(s.id);
    const b = vectors.get(s.parent);
    return a && b ? Math.max(0, 1 - cosine(a, b)) : null;
  };

  const rows = snaps.slice(-40);
  const index = new Map(rows.map((s, i) => [s.id, i]));
  const width = Math.max(1, lanes.length) * LANE + 12;
  const height = rows.length * ROW;
  const x = (branch: string) => 10 + lanes.indexOf(branch) * LANE;
  const y = (i: number) => i * ROW + ROW / 2;

  const vec = sel ? vectors.get(sel.id) : null;
  const max = vec ? Math.max(...vec.map(Math.abs)) || 1 : 1;
  const engineBroken = snaps.filter((s) => broken.has(s.id)).length;

  const fork = () => {
    if (!sel) return;
    const name = branchName.trim().replace(/[^\p{L}\p{N}._/-]+/gu, "-").slice(0, 40) || `what-if-${Date.now().toString(36).slice(-4)}`;
    forkMemory(sel.id, name, scenario);
    setForking(false);
    setBranchName("");
    setScenario("");
    setSelected(null);
  };

  return (
    <Widget
      icon={GitBranch}
      title={c.title}
      sub={c.sub}
      actions={
        <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
          {c.engine}
          <select
            value={engine}
            onChange={(e) => {
              setEngine(e.target.value as EngineKey);
              setSelected(null);
              setForking(false);
            }}
            className="rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[11px] normal-case tracking-normal text-white focus:outline-none"
          >
            {ENGINE_ORDER.map((k) => (
              <option key={k} value={k} className="bg-os-panel">
                {ENGINES[k].name}
              </option>
            ))}
          </select>
        </label>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <CpButton onClick={() => setSelected(commitMemory(engine, c.manual))}>
          <GitCommitHorizontal className="size-3" /> {c.commit}
        </CpButton>
        <CpButton tone="quiet" disabled={!sel} onClick={() => setForking((f) => !f)} aria-expanded={forking}>
          <GitFork className="size-3" /> {c.fork}
        </CpButton>
        <CpButton tone="warn" disabled={!sel || sel.id === headId} onClick={() => sel && rollbackMemory(sel.id)}>
          <History className="size-3" /> {c.rollback}
        </CpButton>
        <span className={cn("ms-auto flex items-center gap-1 font-mono text-[10.5px]", engineBroken ? "text-red-300" : "text-os-emerald")}>
          {engineBroken ? <ShieldAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
          {engineBroken ? c.broken(engineBroken) : c.verified}
        </span>
      </div>

      {forking && sel && (
        <form
          className="mt-2 flex flex-wrap gap-2 rounded-lg border border-white/[0.08] bg-black/30 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            fork();
          }}
        >
          <input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder={c.forkName} maxLength={40} className="w-40 rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-[11.5px] text-white placeholder:text-white/30 focus:outline-none" />
          <input value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder={c.scenario} maxLength={600} className="min-w-0 flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-[11.5px] text-white placeholder:text-white/30 focus:outline-none" />
          <CpButton type="submit">
            <GitFork className="size-3" /> {c.fork} @ {sel.id.slice(0, 7)}
          </CpButton>
        </form>
      )}

      {!rows.length ? (
        <p className="mt-6 text-center font-mono text-[12px] text-white/40">{c.empty}</p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-h-[360px] overflow-y-auto rounded-lg border border-white/[0.06] bg-black/30">
            <div className="relative flex">
              <svg width={width} height={height} className="shrink-0" aria-hidden>
                {rows.map((s, i) => {
                  const pi = s.parent ? index.get(s.parent) : undefined;
                  if (pi === undefined) return null;
                  const parent = rows[pi];
                  const x1 = x(parent.branch);
                  const x2 = x(s.branch);
                  return <path key={`e-${s.id}`} d={`M${x1},${y(pi)} C${x1},${y(i) - ROW / 2} ${x2},${y(pi) + ROW / 2} ${x2},${y(i)}`} fill="none" stroke={LANE_COLORS[lanes.indexOf(s.branch) % LANE_COLORS.length]} strokeOpacity={0.55} strokeWidth={1.5} />;
                })}
                {rows.map((s, i) => {
                  const color = LANE_COLORS[lanes.indexOf(s.branch) % LANE_COLORS.length];
                  const head = s.id === headId;
                  return (
                    <g key={s.id}>
                      {head && <circle cx={x(s.branch)} cy={y(i)} r={8} fill="none" stroke={color} strokeOpacity={0.5} />}
                      <circle cx={x(s.branch)} cy={y(i)} r={head ? 5 : 4} fill={broken.has(s.id) ? "#f87171" : color} />
                    </g>
                  );
                })}
              </svg>
              <ol className="min-w-0 flex-1">
                {rows.map((s) => {
                  const d = drift(s);
                  return (
                    <li key={s.id} style={{ height: ROW }}>
                      <button
                        type="button"
                        onClick={() => setSelected(s.id)}
                        className={cn("flex h-full w-full min-w-0 items-center gap-2 px-2 text-start font-mono text-[11px] transition-colors", sel?.id === s.id ? "bg-os-cyan/[0.08]" : "hover:bg-white/[0.03]")}
                      >
                        <span className="text-os-emerald">{s.hash.slice(0, 7)}</span>
                        {s.id === headId && <span className="rounded bg-os-cyan/15 px-1 text-[9px] text-os-cyan">{c.head}</span>}
                        <span className="text-white/40">{s.branch}</span>
                        <span className="min-w-0 flex-1 truncate font-sans text-white/70">{s.label}</span>
                        <span className="bloom-detail shrink-0 text-white/35">{c.memories(s.memory.length)}</span>
                        {d !== null && <span className="bloom-detail w-16 shrink-0 text-end text-amber-200/70">Δ {d.toFixed(3)}</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {sel && vec && (
            <figure className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-black/30 p-3">
              <div className="grid grid-cols-16 gap-px" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }} title={`${c.dims} · ${sel.hash}`}>
                {vec.map((v, i) => (
                  <span key={i} className="size-2.5 rounded-[1px]" style={{ background: v >= 0 ? `rgb(var(--bloom-accent-rgb) / ${Math.abs(v) / max})` : `rgb(255 0 122 / ${Math.abs(v) / max})`, outline: "1px solid rgb(255 255 255 / 0.03)" }} />
                ))}
              </div>
              <figcaption className="text-center font-mono text-[10px] text-white/45">
                {c.dims} · {sel.hash.slice(0, 12)}
                <br />
                {new Date(sel.at).toLocaleString()}
              </figcaption>
            </figure>
          )}
        </div>
      )}
      {rows.length > 0 && <p className="bloom-detail mt-2 font-mono text-[10px] text-white/35">{c.selectHint}</p>}
    </Widget>
  );
}
