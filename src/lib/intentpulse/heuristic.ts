import { composeSignals } from "./score";
import type { IntentSignal, LeadInput, Persona } from "./types";

/** Keyword fallback used when Groq is not configured or fails. Same output shape as the LLM path. */

const BUDGET_HEDGES = ["not sure", "tbd", "depends", "need approval", "pending approval", "no budget", "haven't decided", "unclear", "tight budget"];
const BUDGET_CONFIRMS = ["approved", "allocated", "signed off", "budget is set", "funded", "purchase order"];
const URGENCY_STRONG = ["asap", "urgent", "immediately", "this week", "next week", "this quarter", "end of quarter", "deadline", "go live", "go-live", "ready to sign", "contract", "procurement", "rfp", "pilot", "demo", "implementation", "timeline", "launch", "start date"];
const URGENCY_WEAK = ["just browsing", "just curious", "someday", "maybe later", "no rush", "next year", "not ready", "no timeline", "newsletter", "just looking", "just researching"];
const STACK = ["salesforce", "hubspot", "marketo", "snowflake", "bigquery", "segment", "aws", "azure", "gcp", "api", "webhook", "sso", "okta", "slack", "zapier", "crm", "integration", "soc 2"];
const AUTHORITY = ["ceo", "cto", "cfo", "coo", "cro", "cmo", "chief", "vp", "vice president", "head of", "director", "founder", "owner", "procurement"];
const COMPETITOR = ["building a similar", "similar tool", "similar product", "benchmarking", "competitor", "competitive analysis", "our roadmap", "how your scoring", "reverse engineer"];
const STUDENT = ["student", "thesis", "class", "homework", "research project", "university", "course"];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const find = (text: string, terms: string[]) =>
  terms.filter((t) => new RegExp(`(^|[^a-z0-9])${esc(t)}([^a-z0-9]|$)`, "i").test(text));

export function heuristicSignals(lead: LeadInput): {
  persona: Persona;
  microSignals: string[];
  signals: IntentSignal[];
  summary: string;
  reasoning: string[];
} {
  const text = `${lead.message} ${lead.company}`.toLowerCase();

  let budget: number;
  if (lead.budgetK === null) budget = 35;
  else if (lead.budgetK >= 250) budget = 100;
  else if (lead.budgetK >= 120) budget = 88 + ((lead.budgetK - 120) / 130) * 12;
  else if (lead.budgetK >= 60) budget = 70 + ((lead.budgetK - 60) / 60) * 18;
  else if (lead.budgetK >= 25) budget = 45 + ((lead.budgetK - 25) / 35) * 25;
  else budget = Math.max(5, (lead.budgetK / 25) * 45);
  const hedges = find(text, BUDGET_HEDGES);
  const confirms = find(text, BUDGET_CONFIRMS);
  budget += Math.min(20, confirms.length * 10) - Math.min(30, hedges.length * 12);

  const strong = find(text, URGENCY_STRONG);
  const weak = find(text, URGENCY_WEAK);
  const urgency = 30 + strong.length * 18 - weak.length * 15;

  const stack = find(text, STACK);
  const techFit = 20 + stack.length * 12;

  const titles = find(text, AUTHORITY);
  const scale = /(\d[\d,]*)\s*(seats|users|employees|reps|people|staff)\b/i.exec(text);
  const headcount = scale ? Number(scale[1].replace(/,/g, "")) : 0;
  const authority = 25 + Math.min(50, titles.length * 25) + (headcount >= 1000 ? 20 : headcount >= 100 ? 15 : headcount >= 20 ? 10 : 0);

  const competitor = find(text, COMPETITOR);
  const student = find(text, STUDENT);
  const persona: Persona = competitor.length
    ? "competitor"
    : student.length
      ? "student"
      : titles.length && strong.length >= 2
        ? "buyer"
        : strong.length || stack.length
          ? "evaluator"
          : "unknown";

  const signals = composeSignals({
    budget: {
      score: budget,
      evidence: [lead.budgetK === null ? "budget undisclosed" : `$${lead.budgetK}k stated`, ...confirms.map((c) => `confirmed: ${c}`), ...hedges.map((h) => `hedge: ${h}`)],
    },
    urgency: { score: urgency, evidence: [...strong.map((t) => `+ ${t}`), ...weak.map((t) => `− ${t}`)] },
    techFit: { score: techFit, evidence: stack.map((t) => `stack: ${t}`) },
    authority: {
      score: authority - (student.length ? 20 : 0),
      evidence: [...titles.map((t) => `title: ${t}`), ...(headcount ? [`${headcount} ${scale![2]}`] : [])],
    },
  });

  const microSignals = [
    ...confirms.map((c) => `Budget ${c}`),
    ...strong.slice(0, 3).map((t) => `Mentions “${t}”`),
    ...competitor.map((t) => `Competitor cue: “${t}”`),
    ...student.slice(0, 1).map((t) => `Academic context: “${t}”`),
    ...weak.slice(0, 2).map((t) => `Low-urgency cue: “${t}”`),
    ...hedges.slice(0, 2).map((h) => `Budget hedge: “${h}”`),
  ];

  return {
    persona,
    microSignals: microSignals.length ? microSignals : ["No strong intent markers detected"],
    signals,
    summary: `Keyword heuristic read this as a ${persona} signal.`,
    reasoning: [
      `Keyword heuristic matched ${strong.length} urgency, ${stack.length} stack, ${titles.length} authority and ${hedges.length} budget-hedge markers.`,
      persona === "competitor" || persona === "student" ? `Persona detected as ${persona} from: ${[...competitor, ...student].join(", ")}.` : `Persona inferred as ${persona}.`,
    ],
  };
}
