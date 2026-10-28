import { AGENTS, getAgent, type AgentId } from "./agents";

export type Deliverable = { agentId: AgentId; title: string; output: string; at: string; humanMinutes: number };

export type MorningBrief = {
  headline: string;
  generatedAt: string;
  totals: { deliverables: number; agents: number; hoursSaved: number; handoffs: number };
  sections: { agentId: AgentId; agent: string; count: number; highlights: string[] }[];
  firstThing: string[];
  source: "compiler";
};

/** Turns a night's deliverables into the brief the owner reads with their coffee. */
export function compileBrief(deliverables: Deliverable[], handoffs: number): MorningBrief {
  const sections = AGENTS.map((a) => {
    const mine = deliverables.filter((d) => d.agentId === a.id);
    return { agentId: a.id, agent: a.name, count: mine.length, highlights: mine.slice(-3).map((d) => `${d.at} · ${d.output}`) };
  }).filter((s) => s.count > 0);

  const minutes = deliverables.reduce((s, d) => s + d.humanMinutes, 0);
  const hoursSaved = Math.round((minutes / 60) * 10) / 10;

  // Anything an agent flagged for a human goes to the top of the morning.
  const flagged = deliverables
    .filter((d) => /flag|escalat|exception|approval|refund/i.test(d.output))
    .map((d) => `${getAgent(d.agentId).name}: ${d.output}`);

  return {
    headline: deliverables.length
      ? `While you slept, ${sections.length} agent${sections.length === 1 ? "" : "s"} shipped ${deliverables.length} deliverable${deliverables.length === 1 ? "" : "s"}, about ${hoursSaved} hours of work.`
      : "The night shift has just started. No deliverables yet.",
    generatedAt: new Date().toISOString(),
    totals: { deliverables: deliverables.length, agents: sections.length, hoursSaved, handoffs },
    sections,
    firstThing: flagged.length ? [...new Set(flagged)].slice(0, 4) : ["Nothing needs your attention. Everything is approved or shipped."],
    source: "compiler",
  };
}
