"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Send, Sparkles, X } from "lucide-react";
import { ENGINES, usdFmt, type Engine } from "./engines";
import { PERSONAS, scenarioFor, type Scenario } from "./tutorial-script";

const DISMISSED = "bloom.command.neural.dismissed";
const EASE = [0.16, 1, 0.3, 1] as const;

/** The header prompt that opens the Neural Breakdown. Dismissing it is remembered in this browser. */
export function NeuralNotice({ onLaunch }: { onLaunch: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    try {
      setShown(localStorage.getItem(DISMISSED) !== "1");
    } catch {
      setShown(true);
    }
  }, []);
  if (!shown) return null;
  const dismiss = () => {
    setShown(false);
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      // Hidden for this visit only.
    }
  };
  return (
    <div className="mt-3 inline-flex max-w-full items-stretch overflow-hidden rounded-lg border border-c-edge/60 bg-c-deep/50 text-[12.5px]">
      <button type="button" onClick={onLaunch} className="group flex min-w-0 items-center gap-2 px-3 py-1.5 text-left text-white/75 transition-colors hover:bg-c-1/10 hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-2">
        <Sparkles className="size-3.5 shrink-0 text-c-2" />
        <span className="min-w-0">
          Confused by what you&apos;re seeing? <span className="font-medium text-c-2 underline decoration-c-2/40 underline-offset-2 group-hover:decoration-c-2">Launch Neural Breakdown</span>
        </span>
      </button>
      <button type="button" onClick={dismiss} aria-label="Dismiss Neural Breakdown prompt" className="border-l border-c-edge/60 px-2 text-white/45 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-2">
        <X className="size-3.5" />
      </button>
    </div>
  );
}

type Msg = { id: number; from: "ai" | "user"; text?: string; scenario?: Scenario; echo?: string };

/**
 * A scripted conversation with the engine's own persona: the hook, the challenge, the user's answer
 * (a quick reply or their own words), then the breakdown: execution, the bundle with a second engine,
 * and a preview of the notifications and capital they'd see once deployed.
 */
export function NeuralChat({ engine, open, onClose }: { engine: Engine; open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <Chat key="chat" engine={engine} onClose={onClose} />}</AnimatePresence>;
}

function Chat({ engine, onClose }: { engine: Engine; onClose: () => void }) {
  const persona = PERSONAS[engine.key];
  const reduce = useReducedMotion();
  const pause = reduce ? 150 : 950;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [stage, setStage] = useState<"intro" | "ask" | "answer" | "done">("intro");
  const [draft, setDraft] = useState("");
  const seq = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Queue AI messages, each preceded by a typing pause. */
  const say = (items: Omit<Msg, "id" | "from">[], then?: () => void) => {
    setTyping(true);
    items.forEach((m, i) => {
      timers.current.push(
        setTimeout(() => {
          setMsgs((ms) => [...ms, { ...m, id: ++seq.current, from: "ai" }]);
          if (i === items.length - 1) {
            setTyping(false);
            then?.();
          }
        }, pause * (i + 1) + (m.scenario ? pause : 0)),
      );
    });
  };

  useEffect(() => {
    panel.current?.focus();
    say([{ text: persona.hook }, { text: persona.challenge }], () => setStage("ask"));
    const ts = timers.current;
    return () => ts.forEach(clearTimeout);
    // Runs once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [msgs, typing, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const answer = (text: string, scenario: Scenario, custom: boolean) => {
    setStage("answer");
    setMsgs((ms) => [...ms, { id: ++seq.current, from: "user", text }]);
    say([{ scenario, echo: custom ? text : undefined }, { text: persona.closer }], () => setStage("done"));
  };
  const submit = () => {
    const t = draft.trim().slice(0, 400);
    if (!t) return;
    setDraft("");
    answer(t, scenarioFor(persona, t), true);
  };
  const again = () => {
    setStage("answer");
    say([{ text: "Again? Good. Winners test the machine. " + persona.challenge }], () => setStage("ask"));
  };

  return (
    <motion.div
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-label={`${engine.name} Neural Breakdown`}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(680px,calc(100dvh-24px))] flex-col overflow-hidden rounded-2xl border border-c-edge/60 bg-black/75 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.95),0_0_40px_-12px_var(--c-glow-soft)] outline-none backdrop-blur-md sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[420px]"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-c-2/70 to-transparent" />
      <header className="flex items-center gap-3 border-b border-c-edge/40 px-4 py-3">
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-c-edge/60 bg-c-deep">
          <span className="size-2.5 rotate-45 border border-c-2/80 bg-c-1/50 shadow-[0_0_12px_2px_var(--c-glow)]" />
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-black bg-c-3" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-logo text-[15px] font-medium leading-tight">{engine.name}</p>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-c-2/80">Neural Breakdown · Engine Nº {engine.index}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Neural Breakdown" className="ml-auto rounded-md p-1.5 text-white/50 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-c-2">
          <X className="size-4" />
        </button>
      </header>

      <div ref={scroller} className="min-h-[200px] flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {msgs.map((m) =>
          m.from === "user" ? (
            <motion.p key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm border border-c-1/30 bg-c-1/15 px-3.5 py-2 text-[13.5px] leading-snug text-white">
              {m.text}
            </motion.p>
          ) : m.scenario ? (
            <Breakdown key={m.id} engine={engine} scenario={m.scenario} echo={m.echo} />
          ) : (
            <motion.p key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-[92%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white/85">
              {m.text}
            </motion.p>
          ),
        )}
        {typing && (
          <div className="flex w-fit gap-1 rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-3.5 py-3" aria-label={`${engine.name} is typing`}>
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="size-1.5 rounded-full bg-c-2" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
        )}
      </div>

      {stage === "ask" && (
        <div className="space-y-2 border-t border-c-edge/40 p-3">
          <div className="flex flex-col gap-1.5">
            {persona.scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => answer(s.reply, s, false)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-[12.5px] leading-snug text-white/80 transition-colors hover:border-c-1/50 hover:bg-c-1/10 hover:text-white focus-visible:outline-2 focus-visible:outline-c-2"
              >
                {s.reply}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 pl-3 focus-within:border-c-1/50"
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Or tell it in your own words…" aria-label="Your answer" maxLength={400} className="h-10 min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/35 focus:outline-none" />
            <button type="submit" disabled={!draft.trim()} aria-label="Send" className="mr-1 rounded-md p-2 text-c-2 transition-opacity disabled:opacity-30">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
      {stage === "done" && (
        <div className="flex flex-wrap gap-2 border-t border-c-edge/40 p-3">
          <button type="button" onClick={again} className="h-9 flex-1 rounded-md border border-white/10 bg-white/[0.03] px-3 text-[12.5px] text-white/80 hover:border-c-1/50 hover:text-white">
            Try another scenario
          </button>
          <button type="button" onClick={onClose} className="h-9 flex-1 rounded-md border border-c-1/50 bg-c-1/15 px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-white hover:bg-c-1/25">
            Back to command
          </button>
        </div>
      )}
    </motion.div>
  );
}

function Breakdown({ engine, scenario: s, echo }: { engine: Engine; scenario: Scenario; echo?: string }) {
  const partner = ENGINES[s.bundle.with];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="space-y-3 rounded-2xl rounded-bl-sm border border-c-edge/50 bg-c-deep/40 p-3.5 text-[13px] leading-relaxed text-white/85">
      {echo && (
        <p className="text-white/60">
          You said: &ldquo;{echo.length > 140 ? echo.slice(0, 140) + "…" : echo}&rdquo;
        </p>
      )}
      <p className="font-medium text-white">{s.read}</p>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-c-2/80">The exact execution</p>
        <ol className="mt-2 space-y-2">
          {s.steps.map((st, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-c-1/50 font-mono text-[10px] text-c-2">{i + 1}</span>
              <span>{st}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-c-1/40 bg-black/40 p-3">
        <p className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-c-2">
          The bundle · {engine.name} + {partner.name}
        </p>
        <p className="mt-1.5">{s.bundle.text}</p>
        <Link href={`/command/${partner.key}`} className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-c-2 hover:text-white">
          Open Engine Nº {partner.index} · {partner.name} <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-c-2/80">What you&apos;ll see once deployed</p>
        <ul className="mt-2 space-y-1.5">
          {s.notifications.map((n, i) => (
            <motion.li
              key={n.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.35, duration: 0.4 }}
              className="flex gap-2.5 rounded-lg border border-white/10 bg-black/50 px-3 py-2"
            >
              <span className="mt-1.5 size-1.5 shrink-0 animate-pulse rounded-full bg-c-1" />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium text-white">{n.title}</span>
                <span className="block text-[12px] leading-snug text-white/65">{n.body}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-c-edge/60 bg-black/40 p-3 text-center">
        <p className="font-logo text-[26px] font-medium tabular-nums tracking-[-0.02em] text-c-2">{usdFmt(s.capital.value)}</p>
        <p className="text-[12px] text-white/65">{s.capital.label}</p>
        <p className="mt-1 text-[10.5px] text-white/40">Sample projection. Live results depend on your business and budget.</p>
      </div>
    </motion.div>
  );
}
