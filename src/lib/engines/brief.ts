import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { BRIEF_TEXT, type RunLang } from "./brief-text";

/**
 * Turns an engine's validated output into the executive brief the desk types out and offers as a Markdown
 * download: headline metrics, the summary, actions (with the ones that need human approval marked), and the
 * engine's domain fields. Deterministic: it renders the output, it never adds to it.
 */

export type Metric = { label: string; value: number; unit: "usd" | "hours" | "percent" | "count" | "score" };
export type Brief = { markdown: string; metrics: Metric[]; approvals: number[] };

type Action = { title: string; owner: string; priority: string; detail: string };

const humanEn = (key: string) =>
  key
    .replace(/Usd$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

function unitOf(key: string): Metric["unit"] | null {
  if (/usd$/i.test(key)) return "usd";
  if (/hours/i.test(key)) return "hours";
  if (/pct$|percent|share/i.test(key)) return "percent";
  if (/score|health|confidence/i.test(key)) return "score";
  if (/meetings|replies|nodes|records|minutes|days/i.test(key)) return "count";
  return null;
}

const RANK: Record<Metric["unit"], number> = { usd: 0, hours: 1, count: 2, percent: 3, score: 4 };

/** Every labeled number in the output, money first; nested objects and arrays of objects are searched too. */
function collectMetrics(value: unknown, human: (k: string) => string, total: (l: string) => string, path = "", out: Metric[] = []): Metric[] {
  if (Array.isArray(value)) {
    // Sum money across lists (e.g. every account's ARR at risk); other list numbers are per-item detail.
    const sums = new Map<string, number>();
    for (const item of value)
      if (item && typeof item === "object")
        // Only additive money is summed: ARR at risk across accounts adds up; alternative prices (proposal tiers) don't.
        for (const [k, v] of Object.entries(item)) if (typeof v === "number" && unitOf(k) === "usd" && /arr|risk|pipeline|value|revenue|spend|budget/i.test(k)) sums.set(k, (sums.get(k) ?? 0) + v);
    for (const [k, v] of sums) out.push({ label: total(human(k)), value: v, unit: "usd" });
    return out;
  }
  if (!value || typeof value !== "object") return out;
  for (const [k, v] of Object.entries(value)) {
    if (k === "confidence") continue;
    if (typeof v === "number") {
      const unit = unitOf(k);
      if (unit) out.push({ label: path ? `${human(path)} · ${human(k).toLowerCase()}` : human(k), value: v, unit });
    } else if (v && typeof v === "object") collectMetrics(v, human, total, k, out);
  }
  return out;
}

const fmt = (m: Metric) =>
  m.unit === "usd"
    ? `$${Math.round(m.value).toLocaleString("en-US")}`
    : m.unit === "hours"
      ? `${m.value.toLocaleString("en-US")} h`
      : m.unit === "percent"
        ? `${m.value}%`
        : m.value.toLocaleString("en-US");

/** The first dollar figure in a line of text ("$40k", "$1.2m", "$12,400"). */
function dollars(text: string): number {
  const m = text.match(/\$\s?(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\b/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return n * (m[2]?.toLowerCase() === "k" ? 1e3 : m[2]?.toLowerCase() === "m" ? 1e6 : 1);
}

function section(key: string, v: unknown, human: (k: string) => string): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) {
    if (!v.length) return "";
    const rows = v.slice(0, 10).map((item) =>
      item && typeof item === "object"
        ? `- ${Object.entries(item)
            .filter(([, x]) => typeof x !== "object")
            .map(([k, x]) => `**${human(k)}:** ${x}`)
            .join(" · ")}`
        : `- ${item}`,
    );
    return `\n### ${human(key)}\n${rows.join("\n")}\n`;
  }
  if (typeof v === "object")
    return `\n### ${human(key)}\n${Object.entries(v)
      .map(([k, x]) => `- **${human(k)}:** ${Array.isArray(x) ? x.join("; ") : typeof x === "object" ? JSON.stringify(x) : x}`)
      .join("\n")}\n`;
  return `\n**${human(key)}:** ${v}\n`;
}

export function buildBrief(engine: EngineKey, output: unknown, opts: { approvalThresholdUsd: number; command: string; mode: string; model: string; title?: string; subtitle?: string; lang?: RunLang }): Brief {
  const o = (output && typeof output === "object" ? output : {}) as { summary?: string; confidence?: number; actions?: Action[] } & Record<string, unknown>;
  const { summary = "", confidence, actions = [], ...rest } = o;
  const e = ENGINES[engine];
  const T = BRIEF_TEXT[opts.lang ?? "en"];
  // Output field names are labeled in the run's language; unknown fields fall back to their English label.
  const human = (k: string) => T.fields[k] ?? humanEn(k);
  const owner = (x: string) => (x === "human" ? T.human : ENGINES[x as EngineKey]?.name ?? x);

  const metrics = collectMetrics(rest, human, T.total)
    .sort((a, b) => RANK[a.unit] - RANK[b.unit])
    .filter((m, i, all) => all.findIndex((x) => x.label === m.label) === i)
    .slice(0, 4);

  // An action waits for a person when a person must do it, or when it moves money at or over the threshold.
  const approvals = actions.flatMap((a, i) => (a.owner === "human" || dollars(`${a.title} ${a.detail}`) >= opts.approvalThresholdUsd ? [i] : []));

  // Sections are separated by blank lines; omitted sections are null, not empty strings.
  const md = [
    `# ${T.title(opts.title ?? e.name)}`,
    `_${opts.subtitle ?? `${T.engineNo(e.index)} · ${T.roles[engine]}`} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · ${opts.mode === "live" ? opts.model : T.simulation}_`,
    `> ${opts.command.replace(/\n+/g, " ")}`,
    `## ${T.summary}\n${summary}${typeof confidence === "number" ? `\n\n**${T.confidence}:** ${Math.round(confidence * 100)}%` : ""}`,
    metrics.length ? `## ${T.keyMetrics}\n| ${T.metric} | ${T.value} |\n| --- | --- |\n${metrics.map((m) => `| ${m.label} | ${fmt(m)} |`).join("\n")}` : null,
    actions.length
      ? `## ${T.actions}\n${actions.map((a, i) => `${i + 1}. **[${(T.priority[a.priority] ?? a.priority).toUpperCase()}] ${a.title}** · ${owner(a.owner)}${approvals.includes(i) ? ` · _${T.requiresApproval}_` : ""}\n   ${a.detail}`).join("\n")}`
      : null,
    Object.keys(rest).length ? `## ${T.detail}${Object.entries(rest).map(([k, v]) => section(k, v, human)).join("")}` : null,
  ]
    .filter((x): x is string => x !== null)
    .join("\n\n");

  return { markdown: md, metrics, approvals };
}
