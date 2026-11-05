"use client";

import { useMemo, useState } from "react";
import { Fingerprint, Play, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandCopy } from "@/components/bloom/command/locale";
import { recordBoardSession, useDeskSettings, type BoardSession, type BoardVote } from "@/components/desk/settings";
import { AGENT_COLORS, BOARD_TEXT, deliberate } from "@/components/os/shadow-board-logic";
import { sha256 } from "@/lib/sha256";
import { useLicensingCopy } from "./copy";
import { CpButton, Widget } from "./widget";

/** Each candidate is signed over exactly what it said: agent, stance, score, points and conditions. */
const candidateSig = (sessionId: string, v: BoardVote) => sha256(`${sessionId}|${v.agent}|${v.stance}|${v.score.toFixed(4)}|${v.points.join("\n")}|${v.conditions.join("\n")}`);

const VERDICT_TONE: Record<BoardSession["verdict"], string> = { approved: "text-os-emerald border-os-emerald/40", rejected: "text-red-300 border-red-400/40", escalate: "text-amber-200 border-amber-300/40" };

/**
 * Shadow Consensus Terminal: a split-screen inspector over the Shadow Board. A decision goes to the three board
 * agents (deterministic, local, no model); their candidate responses sit side by side, each sealed with its own
 * SHA-256 signature, and the session is recorded to the same hash-chained history the Shadow Board keeps.
 */
export function ConsensusTerminal() {
  const c = useLicensingCopy().cp.consensus;
  const { lang } = useCommandCopy();
  const T = BOARD_TEXT[lang];
  const { settings } = useDeskSettings();
  const [subject, setSubject] = useState("");
  const [budget, setBudget] = useState(50_000);
  const sessions = settings.boardSessions;
  const [selected, setSelected] = useState<string | null>(null);
  const session = sessions.find((s) => s.id === selected) ?? sessions.at(-1) ?? null;

  const sigs = useMemo(() => (session ? session.votes.map((v) => candidateSig(session.id, v)) : []), [session]);

  const run = () => {
    const text = subject.trim();
    if (text.length < 3) return;
    const result = deliberate({ subject: text, detail: "", budgetUsd: budget }, lang);
    const id = `cp-${Date.now().toString(36)}`;
    recordBoardSession({ ...result, id, at: Date.now() });
    setSelected(id);
    setSubject("");
  };

  return (
    <Widget icon={Scale} title={c.title} sub={c.sub}>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">{c.title}</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={400}
            placeholder={c.placeholder}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">
          {c.budget}
          <input
            type="number"
            min={0}
            step={1000}
            value={budget}
            onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
            className="w-28 rounded-md border border-white/10 bg-black/40 px-2 py-2 text-[12px] tabular-nums text-white focus:border-os-cyan/50 focus:outline-none"
          />
        </label>
        <CpButton type="submit" disabled={subject.trim().length < 3}>
          <Play className="size-3" /> {c.run}
        </CpButton>
      </form>

      {!session ? (
        <p className="mt-6 text-center font-mono text-[12px] text-white/40">{c.empty}</p>
      ) : (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className={cn("rounded border px-2 py-0.5 uppercase tracking-[0.14em]", VERDICT_TONE[session.verdict])}>{c.verdict[session.verdict]}</span>
            <span className="text-white/50">
              {c.weighted} <span className="text-os-cyan tabular-nums">{(session.score * 100).toFixed(1)}%</span>
            </span>
            <span className="ms-auto flex min-w-0 items-center gap-1.5 text-white/40" title={session.hash}>
              <Fingerprint className="size-3 shrink-0" /> {c.session} <span className="truncate text-os-emerald">{session.hash.slice(0, 16)}…</span>
            </span>
          </div>
          <p className="mt-2 truncate text-[12.5px] text-white/80" title={session.subject}>
            “{session.subject}”
          </p>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {session.votes.map((v, i) => (
              <article key={v.agent} className="flex min-w-0 flex-col rounded-lg border border-white/[0.07] bg-black/35 p-3" style={{ boxShadow: `inset 0 2px 0 ${AGENT_COLORS[v.agent]}` }}>
                <header className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-medium" style={{ color: AGENT_COLORS[v.agent] }}>
                    {T.agents[v.agent].short}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
                    {c.stance[v.stance]} · <span className="tabular-nums text-white/80">{(v.score * 100).toFixed(0)}</span>
                  </span>
                </header>
                <ul className="mt-2 flex-1 space-y-1 text-[11.5px] leading-snug text-white/65">
                  {v.points.map((p) => (
                    <li key={p} className="ps-3 -indent-3">
                      <span className="text-white/25">› </span>
                      {p}
                    </li>
                  ))}
                </ul>
                {v.conditions.length > 0 && (
                  <div className="bloom-detail mt-2 border-t border-white/[0.06] pt-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">{c.conditions}</p>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-amber-100/70">
                      {v.conditions.map((x) => (
                        <li key={x}>· {x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <footer className="mt-2 border-t border-white/[0.06] pt-2 font-mono text-[9.5px] text-white/35" title={sigs[i]}>
                  {c.signature} <span className="break-all text-os-cyan/80">{sigs[i]?.slice(0, 32)}</span>
                </footer>
              </article>
            ))}
          </div>

          {sessions.length > 1 && (
            <div className="bloom-detail mt-3">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{c.recent}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {sessions
                  .slice(-8)
                  .reverse()
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelected(s.id)}
                      className={cn("max-w-56 truncate rounded border px-2 py-0.5 font-mono text-[10.5px] transition-colors", s.id === session.id ? "border-os-cyan/50 text-os-cyan" : "border-white/10 text-white/50 hover:text-white/80")}
                      title={s.subject}
                    >
                      {s.hash.slice(0, 7)} · {s.subject}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}
