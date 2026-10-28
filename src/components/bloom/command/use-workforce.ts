"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHANNELS, COMPANIES, meets, postureOf, usdFmt, type Answers, type Brief, type Channel, type Engine, type Flow, type Stance } from "./engines";
import { flowKey, saveSnapshot, type SavedCard, type SavedFeedItem, type WorkforceSnapshot } from "./storage";

export type CardState = SavedCard;
export type FeedItem = SavedFeedItem;
export type FlowState = Flow & { live: number; flash: number };

// How hard each stance works a card: share of ticker activity and how often its count grows.
const WEIGHT: Record<Stance, number> = { stealth: 0.6, balanced: 1, aggressive: 1.6 };
const GROWTH: Record<Stance, number> = { stealth: 0.25, balanced: 0.4, aggressive: 0.6 };

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const pad = (n: number) => String(n).padStart(2, "0");

/** "12 agents closing 8 active sales" → "closing 8 active sales", for plain-English system lines. */
export const taskOf = (title: string) => title.replace(/^\d+ agents? /, "");

/**
 * The deployed shadow workforce, simulated in the browser: cards the user can re-staff, re-stance,
 * pause or hand to a human, a plain-English activity feed, live cross-engine hand-offs, and the
 * running totals behind the 24-hour executive brief. Picks up from `saved` and persists every change,
 * so a refresh or a trip to another engine resumes exactly where it left off.
 */
export function useWorkforce(engine: Engine, answers: Answers, saved?: WorkforceSnapshot) {
  const posture = useMemo(() => postureOf(engine, answers), [engine, answers]);
  const total = useMemo(() => engine.cards.reduce((s, c) => s + c.agents, 0), [engine]);

  const [cards, setCards] = useState<CardState[]>(() => saved?.cards ?? engine.cards.map((c) => ({ id: c.id, agents: c.agents, count: c.count, stance: posture.stance, paused: false, human: false })));
  const [flows, setFlows] = useState<FlowState[]>(() =>
    engine.flows.filter((f) => meets(answers, f.requires)).map((f) => ({ ...f, live: saved?.flows[flowKey(f)] ?? f.n, flash: 0 })),
  );
  const [feed, setFeed] = useState<FeedItem[]>(() => saved?.feed ?? []);
  const [gains, setGains] = useState<Brief>(() => saved?.gains ?? { leads: 0, pipeline: 0, hours: 0 });

  const seq = useRef(saved?.seq ?? 0);
  const restored = useRef(Boolean(saved?.feed.length));
  const ticks = useRef(0);
  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // Set on re-calibration: the view may still be animating out, and must neither tick nor save again,
  // or it would write the deployment straight back after it was cleared.
  const retired = useRef(false);

  useEffect(() => {
    if (retired.current) return;
    saveSnapshot(engine.key, {
      answers,
      deployed: true,
      workforce: { cards, flows: Object.fromEntries(flows.map((f) => [flowKey(f), f.live])), feed, gains, seq: seq.current },
    });
  }, [engine.key, answers, cards, flows, feed, gains]);

  // The channel the viewer is filtering on: most new signals are drawn from it, so the view stays alive.
  const focus = useRef<Channel | null>(null);
  const setFocus = useCallback((ch: Channel | null) => {
    focus.current = ch;
  }, []);

  const push = useCallback((text: string, meta: Omit<FeedItem, "id" | "at" | "text"> = {}) => {
    setFeed((f) => [{ id: ++seq.current, at: Date.now(), text, ...meta }, ...f].slice(0, 60));
  }, []);

  const emit = useCallback(() => {
    if (retired.current) return;
    const live = cardsRef.current.filter((c) => !c.paused && !c.human && c.agents > 0);
    if (!live.length) return;
    let r = Math.random() * live.reduce((s, c) => s + c.agents * WEIGHT[c.stance], 0);
    const card = live.find((c) => (r -= c.agents * WEIGHT[c.stance]) <= 0) ?? live[0];
    const def = engine.cards.find((d) => d.id === card.id)!;
    const ev = pick(def.events.filter((e) => meets(answers, e.requires)));
    if (!ev) return;

    const amt = ev.amt ? Math.round((ev.amt[0] + Math.random() * (ev.amt[1] - ev.amt[0])) / 100) * 100 : 0;
    const co = pick(COMPANIES);
    const ch = engine.channels ? (focus.current && Math.random() < 0.75 ? focus.current : pick(CHANNELS).id) : undefined;
    const text = ev.text
      .replace("{agent}", `Agent #${pad(1 + Math.floor(Math.random() * total))}`)
      .replace("{co}", co)
      .replace("{amt}", usdFmt(amt))
      .replace("{ch}", CHANNELS.find((c) => c.id === ch)?.label ?? "");
    push(text, { card: card.id, co: ev.text.includes("{co}") ? co : undefined, amt: amt || undefined, ch, lead: ev.lead });

    const grow = Math.random() < GROWTH[card.stance];
    if (grow) setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, count: c.count + 1 } : c)));
    setGains((g) => ({ leads: g.leads + (ev.lead ? 1 : 0), pipeline: g.pipeline + (ev.deal ? amt : 0), hours: g.hours + 0.1 + card.agents * 0.02 }));

    if (++ticks.current % 3 === 0) {
      setFlows((fs) => {
        if (!fs.length) return fs;
        const i = Math.floor(Math.random() * fs.length);
        return fs.map((f, j) => (j === i ? { ...f, live: f.live + 1 + Math.floor(Math.random() * 2), flash: Date.now() } : f));
      });
    }
  }, [answers, engine, push, total]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const base = 2300 / posture.tempo;
    const run = () => {
      emit();
      t = setTimeout(run, base * (0.6 + Math.random() * 0.8));
    };
    // A fresh deployment gets a few lines straight away, so the feed never opens empty.
    if (!restored.current) {
      emit();
      emit();
    }
    restored.current = false;
    t = setTimeout(run, 500);
    return () => clearTimeout(t);
  }, [emit, posture.tempo]);

  const label = (id: string) => {
    const c = cardsRef.current.find((x) => x.id === id)!;
    return taskOf(engine.cards.find((d) => d.id === id)!.title(c.agents, c.count));
  };
  const update = (id: string, patch: Partial<CardState>) => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const allocated = cards.reduce((s, c) => s + c.agents, 0);

  return {
    total,
    deployed: cards.reduce((s, c) => s + (c.paused || c.human ? 0 : c.agents), 0),
    reserve: total - allocated,
    stance: posture.stance,
    setFocus,
    /** Stops the workforce for good: no more activity and no more saves. */
    retire: () => {
      retired.current = true;
    },
    cards,
    flows,
    feed,
    brief: { leads: engine.brief.base.leads + gains.leads, pipeline: engine.brief.base.pipeline + gains.pipeline, hours: engine.brief.base.hours + gains.hours } satisfies Brief,
    setAgents: (id: string, n: number) => {
      const c = cards.find((x) => x.id === id)!;
      update(id, { agents: Math.max(0, Math.min(n, c.agents + total - allocated)) });
    },
    setStance: (id: string, stance: Stance) => {
      update(id, { stance });
      push(`You switched the agents ${label(id)} to ${stance[0].toUpperCase() + stance.slice(1)}`, { system: true });
    },
    togglePause: (id: string) => {
      const c = cards.find((x) => x.id === id)!;
      update(id, { paused: !c.paused });
      push(`You ${c.paused ? "resumed" : "paused"} the agents ${label(id)}`, { system: true });
    },
    toggleHuman: (id: string) => {
      const c = cards.find((x) => x.id === id)!;
      update(id, { human: !c.human });
      push(c.human ? `The agents took back the work: ${label(id)}` : `Handed to a person on your team: ${label(id)}. Agents are standing by`, { system: true });
    },
  };
}

export type Workforce = ReturnType<typeof useWorkforce>;
