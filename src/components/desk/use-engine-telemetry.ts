"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { COMPANIES, ENGINES, usdFmt, type EngineKey } from "@/components/bloom/command/engines";
import { METRIC_BASE } from "./metrics";

export type QueueJob = { id: number; text: string; card: string; amt: number; status: "queued" | "running" | "done"; startedAt: number; ms: number };
export type MemoryNode = { id: string; label: string; kind: "engine" | "memory" | "account" | "task"; weight: number };

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/**
 * A live, simulated read of one engine's workforce for the architecture drawer, built from the engine's own
 * card data (agent clusters, tasks, activity templates). Jobs move queued → running → done, gauges accrue from
 * finished jobs, and agent nodes flicker as they pick work up. Nothing is persisted; it's a live view.
 */
export function useEngineTelemetry(engine: EngineKey, memory: string[], paused: boolean) {
  const e = ENGINES[engine];
  const reduce = useReducedMotion();
  const seq = useRef(0);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [gauges, setGauges] = useState(() => ({ generated: METRIC_BASE[engine] * 0.04, hours: 120 + e.brief.base.hours, pipeline: e.brief.base.pipeline }));
  const [busy, setBusy] = useState<Record<string, number>>({});

  const makeJob = (status: QueueJob["status"]): QueueJob => {
    const card = pick(e.cards);
    const ev = pick(card.events);
    const amt = ev.amt ? Math.round((ev.amt[0] + Math.random() * (ev.amt[1] - ev.amt[0])) / 100) * 100 : 0;
    const text = ev.text
      .replace("{agent}", `Agent #${String(1 + Math.floor(Math.random() * card.agents)).padStart(2, "0")}`)
      .replace("{co}", pick(COMPANIES))
      .replace("{amt}", usdFmt(amt))
      .replace("{ch}", pick(["LinkedIn", "Reddit", "X", "Instagram"]));
    return { id: ++seq.current, text, card: card.id, amt, status, startedAt: Date.now(), ms: 600 + Math.random() * 2600 };
  };

  // Reset when the engine changes; open with a few jobs in flight so the drawer never starts empty.
  useEffect(() => {
    setJobs([makeJob("done"), makeJob("done"), makeJob("running"), makeJob("queued"), makeJob("queued")]);
    setGauges({ generated: METRIC_BASE[engine] * 0.04, hours: 120 + e.brief.base.hours, pipeline: e.brief.base.pipeline });
    // makeJob reads only the engine, which is this effect's dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useEffect(() => {
    if (paused || reduce) return;
    const t = setInterval(() => {
      const now = Date.now();
      setJobs((js) => {
        let finished: QueueJob[] = [];
        const next = js.map((j) => {
          if (j.status === "running" && now - j.startedAt > j.ms) {
            const done = { ...j, status: "done" as const };
            finished = [...finished, done];
            return done;
          }
          return j;
        });
        // Keep two to three jobs running; promote the oldest queued ones.
        const running = next.filter((j) => j.status === "running").length;
        let promote = Math.max(0, 2 + (Math.random() < 0.4 ? 1 : 0) - running);
        const promoted = next.map((j) => (j.status === "queued" && promote-- > 0 ? { ...j, status: "running" as const, startedAt: now } : j));
        if (finished.length)
          setGauges((g) => ({
            generated: g.generated + finished.reduce((s, j) => s + (j.amt || 400 + Math.random() * 1600), 0),
            hours: g.hours + finished.length * (0.2 + Math.random() * 0.6),
            pipeline: g.pipeline + finished.reduce((s, j) => s + j.amt * 0.6, 0),
          }));
        const queued = promoted.filter((j) => j.status === "queued").length;
        const withNew = queued < 3 ? [...promoted, makeJob("queued")] : promoted;
        return withNew.slice(-40);
      });
      // Light a few agents in random clusters, as if they were picking work up.
      setBusy(Object.fromEntries(e.cards.map((c) => [c.id, Math.floor(Math.random() * c.agents)])));
    }, 900);
    return () => clearInterval(t);
    // makeJob reads only the engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, paused, reduce]);

  /** Memory graph: the engine at the center, its retained results and the accounts and tasks they touch. */
  const graph = useMemo(() => {
    const nodes: MemoryNode[] = [{ id: "core", label: e.name, kind: "engine", weight: 3 }];
    const edges: [string, string][] = [];
    memory.slice(-4).forEach((m, i) => {
      const id = `m${i}`;
      nodes.push({ id, label: m.length > 44 ? `${m.slice(0, 44)}…` : m, kind: "memory", weight: 2 });
      edges.push(["core", id]);
    });
    const accounts = [...new Set(jobs.map((j) => COMPANIES.find((c) => j.text.includes(c))).filter(Boolean) as string[])].slice(0, 4);
    accounts.forEach((a, i) => {
      nodes.push({ id: `a${i}`, label: a, kind: "account", weight: 1 });
      edges.push([memory.length ? `m${i % Math.min(4, memory.length)}` : "core", `a${i}`]);
    });
    e.cards.slice(0, 3).forEach((c, i) => {
      nodes.push({ id: `t${i}`, label: c.title(c.agents, c.count).replace(/^\d+ agents? /, ""), kind: "task", weight: 1 });
      edges.push(["core", `t${i}`]);
    });
    return { nodes, edges };
  }, [e, memory, jobs]);

  return { jobs, gauges, busy, graph };
}
