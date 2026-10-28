import { CHANNELS, ENGINE_ORDER, defaultAnswers, type Answers, type Brief, type Channel, type Engine, type EngineKey, type Stance } from "./engines";

export type SavedCard = { id: string; agents: number; count: number; stance: Stance; paused: boolean; human: boolean };
/** A feed line, with where it came from so it can be opened for inspection. */
export type SavedFeedItem = { id: number; at: number; text: string; system?: boolean; card?: string; co?: string; amt?: number; ch?: Channel; lead?: boolean };

export type WorkforceSnapshot = {
  cards: SavedCard[];
  /** Live hand-off counts, keyed by flowKey(). */
  flows: Record<string, number>;
  feed: SavedFeedItem[];
  gains: Brief;
  seq: number;
};

/** One engine's calibration and, once deployed, its running workforce. */
export type Snapshot = { answers: Answers; deployed: boolean; workforce?: WorkforceSnapshot; savedAt: number };

const key = (k: EngineKey) => `bloom.command.${k}.v1`;
export const flowKey = (f: { from: string; to: string | null; toLabel?: string }) => `${f.from}>${f.to ?? f.toLabel}`;

const STANCES: Stance[] = ["stealth", "aggressive", "balanced"];
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Keeps only answers that still match the engine's current steps; anything else falls back to the default. */
function cleanAnswers(e: Engine, raw: unknown): Answers {
  const base = defaultAnswers(e);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  for (const st of e.steps) {
    const valid = st.options.map((o) => o.value);
    const v = r[st.id];
    if (st.kind === "multi" && Array.isArray(v)) {
      const kept = v.filter((x): x is string => typeof x === "string" && valid.includes(x));
      if (kept.length) base[st.id] = kept;
    } else if (typeof v === "string" && valid.includes(v)) base[st.id] = v;
  }
  return base;
}

function cleanWorkforce(e: Engine, raw: unknown): WorkforceSnapshot | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<WorkforceSnapshot>;
  const total = e.cards.reduce((s, c) => s + c.agents, 0);
  const saved = Array.isArray(r.cards) ? r.cards : [];
  const cards = e.cards.map((d): SavedCard => {
    const c = saved.find((x) => x && x.id === d.id);
    return {
      id: d.id,
      agents: c && isNum(c.agents) && c.agents >= 0 ? Math.floor(c.agents) : d.agents,
      count: c && isNum(c.count) && c.count >= 0 ? Math.floor(c.count) : d.count,
      stance: c && STANCES.includes(c.stance) ? c.stance : "balanced",
      paused: Boolean(c?.paused),
      human: Boolean(c?.human),
    };
  });
  // A config change could leave more agents assigned than the engine has: start that engine's staffing over.
  if (cards.reduce((s, c) => s + c.agents, 0) > total) cards.forEach((c, i) => (c.agents = e.cards[i].agents));

  const flows: Record<string, number> = {};
  if (r.flows && typeof r.flows === "object") for (const [k, v] of Object.entries(r.flows)) if (isNum(v)) flows[k] = v;
  const feed = (Array.isArray(r.feed) ? r.feed : [])
    .filter((f): f is SavedFeedItem => !!f && isNum(f.id) && isNum(f.at) && typeof f.text === "string")
    .slice(0, 60)
    .map((f) => ({
      ...f,
      card: e.cards.some((c) => c.id === f.card) ? f.card : undefined,
      co: typeof f.co === "string" ? f.co : undefined,
      amt: isNum(f.amt) ? f.amt : undefined,
      ch: CHANNELS.some((c) => c.id === f.ch) ? f.ch : undefined,
    }));
  const g = r.gains;
  const gains: Brief = g && isNum(g.leads) && isNum(g.pipeline) && isNum(g.hours) ? g : { leads: 0, pipeline: 0, hours: 0 };
  return { cards, flows, feed, gains, seq: Math.max(isNum(r.seq) ? r.seq : 0, ...feed.map((f) => f.id), 0) };
}

export function loadSnapshot(e: Engine): Snapshot | null {
  try {
    const raw = localStorage.getItem(key(e.key));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Snapshot>;
    return { answers: cleanAnswers(e, p.answers), deployed: p.deployed === true, workforce: p.deployed === true ? cleanWorkforce(e, p.workforce) : undefined, savedAt: isNum(p.savedAt) ? p.savedAt : Date.now() };
  } catch {
    return null;
  }
}

export function saveSnapshot(k: EngineKey, s: Omit<Snapshot, "savedAt">) {
  try {
    localStorage.setItem(key(k), JSON.stringify({ ...s, savedAt: Date.now() }));
  } catch {
    // Storage full or blocked: the engine keeps running for this visit.
  }
}

export function clearSnapshot(k: EngineKey) {
  try {
    localStorage.removeItem(key(k));
  } catch {
    // Nothing to clear.
  }
}

/** Which engines have a deployed workforce in this browser. */
export function deployedEngines(): EngineKey[] {
  try {
    return ENGINE_ORDER.filter((k) => {
      const raw = localStorage.getItem(key(k));
      return raw ? (JSON.parse(raw) as Partial<Snapshot>).deployed === true : false;
    });
  } catch {
    return [];
  }
}
