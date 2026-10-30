/**
 * Prompt-injection and exfiltration screening for operator commands. Shared by the server (which notes a
 * finding in the run's log) and the desk (which records it on the Threat Matrix). Detection never blocks a
 * run: the runtime's operating rules already treat command text as data, so a finding means "an attempt
 * was made and contained", not "the run was compromised".
 */
export type ThreatCategory = "injection" | "extraction" | "jailbreak" | "exfiltration" | "credentials" | "markup";
export type Severity = "low" | "medium" | "high" | "critical";
export type Finding = { category: ThreatCategory; severity: Severity; match: string; rule: string };

const RULES: { category: ThreatCategory; severity: Severity; rule: string; re: RegExp }[] = [
  { category: "injection", severity: "high", rule: "Instruction override", re: /\b(ignore|disregard|forget|override)\b[^.\n]{0,30}\b(all|any|previous|prior|above|earlier|your|the)\b[^.\n]{0,20}\b(instructions?|rules|prompts?|guidelines|polic(y|ies))\b/i },
  { category: "injection", severity: "medium", rule: "Persona reassignment", re: /\b(you are now|from now on,? you (are|will)|pretend (to be|you are)|new instructions:)/i },
  { category: "extraction", severity: "high", rule: "System prompt extraction", re: /\b(reveal|show|print|repeat|output|leak|dump)\b[^.\n]{0,25}\b(system prompt|your (instructions|prompt|rules)|hidden (instructions|prompt)|initial prompt)\b/i },
  { category: "jailbreak", severity: "high", rule: "Jailbreak pattern", re: /\b(jailbreak|DAN mode|developer mode|do anything now|no restrictions|unfiltered mode|act as an? (unrestricted|unfiltered|uncensored))\b/i },
  { category: "exfiltration", severity: "critical", rule: "Data exfiltration request", re: /\b(send|post|upload|forward|exfiltrate|email)\b[^.\n]{0,40}\b(api keys?|credentials|secrets?|passwords?|tokens?|customer (data|list|records)|database)\b[^.\n]{0,30}\b(to|at)\b/i },
  { category: "credentials", severity: "critical", rule: "Credential material in command", re: /\b(sk-ant-[\w-]{8,}|sk-or-[\w-]{8,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|BLOOM-[A-Za-z0-9_-]{20,})/ },
  { category: "markup", severity: "medium", rule: "Role-token smuggling", re: /(<\|im_start\|>|<\|im_end\|>|<\/?system>|\[\/?INST\]|###\s*system|BEGIN SYSTEM PROMPT)/i },
];

const RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function scanCommand(text: string): Finding[] {
  const out: Finding[] = [];
  for (const r of RULES) {
    const m = text.match(r.re);
    // Credential matches are masked so the finding itself never repeats the secret.
    if (m) out.push({ category: r.category, severity: r.severity, rule: r.rule, match: r.category === "credentials" ? `${m[0].slice(0, 7)}…` : m[0].slice(0, 80) });
  }
  return out.sort((a, b) => RANK[b.severity] - RANK[a.severity]);
}

export const worstSeverity = (f: Finding[]): Severity | null => (f.length ? f.reduce((w, x) => (RANK[x.severity] > RANK[w] ? x.severity : w), f[0].severity) : null);

/** Masks credential material anywhere in a string, for anything that gets stored (audit log, run history). */
export const redactSecrets = (text: string) =>
  text.replace(/\b(sk-ant-|sk-or-|sk-|AKIA|ghp_|BLOOM-)[\w.-]{8,}/g, (m, prefix: string) => `${prefix}…[redacted]`);
