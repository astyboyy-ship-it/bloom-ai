"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Send, Sparkles, X } from "lucide-react";
import { ENGINES, isEngineKey, usdFmt, type Engine, type EngineKey } from "./engines";
import { SNAP } from "../motion";
import { localizePersona, useCommandCopy } from "./locale";
import { CARD_MARKER, type QuickReply, type Scenario } from "./tutorial-script";

const DISMISSED = "bloom.command.neural.dismissed";
const EASE = [0.16, 1, 0.3, 1] as const;

/** The header prompt that opens the Neural Breakdown. Dismissing it is remembered in this browser. */
export function NeuralNotice({ onLaunch }: { onLaunch: () => void }) {
  const { c } = useCommandCopy();
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
      <button type="button" onClick={onLaunch} className="group flex min-w-0 items-center gap-2 px-3 py-1.5 text-start text-white/75 transition-colors hover:bg-c-1/10 hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-2">
        <Sparkles className="size-3.5 shrink-0 text-c-2" />
        <span className="min-w-0">
          {c.confused} <span className="font-medium text-c-2 underline decoration-c-2/40 underline-offset-2 group-hover:decoration-c-2">{c.launchNeural}</span>
        </span>
      </button>
      <button type="button" onClick={dismiss} aria-label={c.dismissNeural} className="border-s border-c-edge/60 px-2 text-white/45 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-2">
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/** The API's own error message ({ error: { message } }), or the status line when the body isn't JSON (e.g. a 404 page). */
async function errorOf(res: Response) {
  const body = await res.text().catch(() => "");
  try {
    const msg = JSON.parse(body)?.error?.message;
    if (typeof msg === "string" && msg) return `HTTP ${res.status}: ${msg}`;
  } catch {
    // Not JSON.
  }
  return `HTTP ${res.status} ${res.statusText || ""}`.trim() + (res.status === 404 ? " (/api/chat is not deployed or is blocked)" : "");
}

// If the engine names itself or an unknown engine as its bundle partner, the card pairs it with this one.
const PARTNER: Record<EngineKey, EngineKey> = { sovereign: "apex", apex: "intentpulse", coreops: "sovereign", intentpulse: "apex", vanguard: "apex", cortex: "apex", shield: "aether", aether: "shield" };

const str = (v: unknown, max = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/**
 * The execution card the live engine writes after its pitch (see CARD_MARKER in the system prompt), as the
 * same Scenario the card renders. Anything malformed means no card rather than a made-up one.
 */
function parseCard(raw: string, engine: Engine): Scenario | undefined {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!json) return undefined;
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(json);
  } catch {
    return undefined;
  }
  const steps = Array.isArray(d.steps) ? d.steps.map((x) => str(x)).filter((x): x is string => Boolean(x)) : [];
  const bundle = (d.bundle ?? {}) as Record<string, unknown>;
  const capital = (d.capital ?? {}) as Record<string, unknown>;
  const value = typeof capital.value === "number" ? capital.value : Number(String(capital.value ?? "").replace(/[^\d.]/g, ""));
  const notifications = (Array.isArray(d.notifications) ? d.notifications : [])
    .map((n) => ({ title: str((n as Record<string, unknown>)?.title, 80), body: str((n as Record<string, unknown>)?.body, 200) }))
    .filter((n): n is { title: string; body: string } => Boolean(n.title && n.body))
    .slice(0, 3);
  const read = str(d.read);
  const bundleText = str(bundle.text);
  // Engines with a headline metric (05–08) always report it under the number, in the visitor's language.
  const label = engine.metric ?? str(capital.label, 160);
  if (!read || steps.length < 2 || !bundleText || !notifications.length || !Number.isFinite(value) || value <= 0 || !label) return undefined;
  const partner = typeof bundle.with === "string" && isEngineKey(bundle.with) && bundle.with !== engine.key ? bundle.with : PARTNER[engine.key];
  return {
    id: "live",
    reply: "",
    match: /$^/,
    read,
    steps: steps.slice(0, 3),
    bundle: { with: partner, text: bundleText },
    notifications,
    capital: { value: Math.round(value), label },
  };
}

type Msg = { id: number; from: "ai" | "user"; text?: string; scenario?: Scenario; echo?: string };

/**
 * A conversation with the engine's own persona: the scripted hook and challenge, then the live engine at
 * /api/chat, in the visitor's language. Discovery replies are a short pitch ending in one question; once the
 * engine has enough to go on (or the visitor asks for the plan) its closing reply also carries an execution
 * card (the steps, the bundle with a second engine, first-week notifications and a capital projection)
 * written for that visitor's business. The input stays open after every reply.
 */
export function NeuralChat({ engine, open, onClose }: { engine: Engine; open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <Chat key="chat" engine={engine} onClose={onClose} />}</AnimatePresence>;
}

function Chat({ engine, onClose }: { engine: Engine; onClose: () => void }) {
  const { lang, c } = useCommandCopy();
  // Fixed for this opening, so the script doesn't change language halfway through.
  const [persona] = useState(() => localizePersona(engine.key, lang));
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
  const live = useRef<AbortController | null>(null);
  // Follow new messages only while the reader is at the bottom, so scrolling up to reread is never yanked back.
  const pinned = useRef(true);

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
    return () => {
      ts.forEach(clearTimeout);
      live.current?.abort();
    };
    // Runs once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [msgs, typing]);
  const onScroll = () => {
    const el = scroller.current;
    if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /**
   * Sends the user's words, the conversation so far and their UI language to the live engine at /api/chat.
   * The pitch streams into the usual AI bubbles (one per paragraph). Only a closing reply carries card JSON
   * after CARD_MARKER: it is held back and rendered as the execution card once complete and valid; a
   * discovery reply shows only its bubbles. There is no scripted fallback: if the engine can't answer, it
   * says why and the visitor can send again.
   */
  const ask = async (t: string) => {
    setStage("answer");
    pinned.current = true;
    setMsgs((ms) => [...ms, { id: ++seq.current, from: "user", text: t }]);
    setTyping(true);

    const history = [...msgs.flatMap((m) => {
      const content = m.scenario ? [m.scenario.read, ...m.scenario.steps, m.scenario.bundle.text].join(" ") : m.text;
      return content ? [{ role: m.from === "user" ? "user" : "assistant", content: content.slice(0, 2000) }] : [];
    }), { role: "user", content: t }].slice(-16);

    const ids: number[] = [];
    let acc = "";
    // Where the card starts: the marker (even half-arrived), or a bare card object if the marker was skipped.
    const cardAt = () => [acc.indexOf("<<<"), acc.indexOf('{"read"')].filter((i) => i >= 0).reduce((a, b) => Math.min(a, b), Infinity);
    const pitchOf = () => acc.slice(0, cardAt());
    const render = () => {
      const paras = pitchOf().split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
      while (ids.length < paras.length) ids.push(++seq.current);
      setMsgs((ms) => [...ms.filter((m) => !ids.includes(m.id)), ...paras.map((text, i) => ({ id: ids[i], from: "ai" as const, text }))]);
    };

    const ctrl = new AbortController();
    live.current = ctrl;
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ engine: engine.key, lang, messages: history }), signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error(await errorOf(res));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (pitchOf().trim()) {
          render();
          // Dots again while the card is being written.
          setTyping(cardAt() < Infinity);
        }
      }
      if (!pitchOf().trim()) throw new Error("The engine returned an empty reply.");
      setTyping(false);
      // Only a closing reply carries a card; a discovery reply ends here with just its bubbles.
      const at = cardAt();
      const card = at === Infinity ? undefined : parseCard(acc.slice(at).replace(CARD_MARKER, ""), engine);
      if (card) setMsgs((ms) => [...ms, { id: ++seq.current, from: "ai", scenario: card }]);
      else if (at !== Infinity) console.warn("[neural breakdown] the engine's execution card was incomplete or malformed; showing the pitch only.");
      setStage("done");
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setTyping(false);
      if (acc.trim()) {
        // Cut off mid-reply: keep what arrived.
        setStage("done");
        return;
      }
      console.error("[neural breakdown] live chat failed:", err);
      // Shown as-is so a misconfigured deployment says exactly what's wrong (missing key, 404, upstream error).
      const reason = err instanceof Error ? err.message : String(err);
      setMsgs((ms) => [...ms, { id: ++seq.current, from: "ai", text: `${c.liveError}

⚠ ${reason}` }]);
      setStage("ask");
    }
  };
  const submit = () => {
    const t = draft.trim().slice(0, 400);
    if (!t) return;
    setDraft("");
    void ask(t);
  };
  const quick = (sc: QuickReply) => void ask(sc.reply);

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 ps-3 focus-within:border-c-1/50"
    >
      <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={c.ownWords} aria-label={c.yourAnswer} maxLength={400} className="h-10 min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/35 focus:outline-none" />
      <button type="submit" disabled={!draft.trim()} aria-label={c.send} className="me-1 rounded-md p-2 text-c-2 transition-opacity disabled:opacity-30">
        <Send className="size-4 rtl:-scale-x-100" />
      </button>
    </form>
  );
  const again = () => {
    setStage("answer");
    say([{ text: c.againLine + persona.challenge }], () => setStage("ask"));
  };

  return (
    <motion.div
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-label={`${engine.name} ${c.neural}`}
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 48 }}
      transition={SNAP}
      // A full-height sidebar on the right: header and footer keep their size, only the messages scroll.
      className="fixed bottom-0 right-0 top-0 z-50 flex h-dvh w-full will-change-transform flex-col overflow-hidden border-l border-c-edge/60 bg-black/80 shadow-[0_0_120px_-30px_rgb(0_0_0/0.95),0_0_40px_-12px_var(--c-glow-soft)] outline-none backdrop-blur-md sm:w-[500px] md:w-[600px] lg:w-[680px]"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-c-2/70 to-transparent" />
      <header className="flex shrink-0 items-center gap-3 border-b border-c-edge/40 px-4 py-3">
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-c-edge/60 bg-c-deep">
          <span className="size-2.5 rotate-45 border border-c-2/80 bg-c-1/50 shadow-[0_0_12px_2px_var(--c-glow)]" />
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-black bg-c-3" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-logo text-[15px] font-medium leading-tight">{engine.name}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-c-2/80">
            {c.neural} · {c.engineNo} {engine.index}
            {engine.badge && <EngineBadge>{engine.badge}</EngineBadge>}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label={c.closeNeural} className="ms-auto rounded-md p-1.5 text-white/50 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-c-2">
          <X className="size-4" />
        </button>
      </header>

      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6" aria-live="polite">
        {msgs.map((m) =>
          m.from === "user" ? (
            <motion.p key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ms-auto max-w-[85%] rounded-2xl rounded-ee-sm border border-c-1/30 bg-c-1/15 px-3.5 py-2 text-[13.5px] leading-snug text-white">
              {m.text}
            </motion.p>
          ) : m.scenario ? (
            <Breakdown key={m.id} engine={engine} scenario={m.scenario} echo={m.echo} />
          ) : (
            <motion.p key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-[92%] whitespace-pre-line rounded-2xl rounded-es-sm border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white/85">
              {m.text}
            </motion.p>
          ),
        )}
        {typing && (
          <div className="flex w-fit gap-1 rounded-2xl rounded-es-sm border border-white/10 bg-white/[0.04] px-3.5 py-3" aria-label={c.typing(engine.name)}>
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="size-1.5 rounded-full bg-c-2" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
        )}
      </div>

      {stage === "ask" && (
        <div className="shrink-0 space-y-2 border-t border-c-edge/40 p-3">
          <div className="flex max-h-[30dvh] flex-col gap-1.5 overflow-y-auto">
            {persona.scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => quick(s)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-start text-[12.5px] leading-snug text-white/80 transition-colors hover:border-c-1/50 hover:bg-c-1/10 hover:text-white focus-visible:outline-2 focus-visible:outline-c-2"
              >
                {s.reply}
              </button>
            ))}
          </div>
          {form}
        </div>
      )}
      {stage === "done" && (
        <div className="shrink-0 space-y-2 border-t border-c-edge/40 p-3">
          {/* Answer the engine's discovery question, or start over. */}
          {form}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={again} className="h-9 flex-1 rounded-md border border-white/10 bg-white/[0.03] px-3 text-[12.5px] text-white/80 hover:border-c-1/50 hover:text-white">
              {c.again}
            </button>
            <button type="button" onClick={onClose} className="h-9 flex-1 rounded-md border border-c-1/50 bg-c-1/15 px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-white hover:bg-c-1/25">
              {c.backToCommand}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/** The engine's domain tag (PIPELINE, CLOSING…), in its palette. */
export function EngineBadge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-c-2/40 bg-c-1/15 px-2 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-c-2">{children}</span>;
}

function Breakdown({ engine, scenario: s, echo }: { engine: Engine; scenario: Scenario; echo?: string }) {
  const partner = ENGINES[s.bundle.with];
  const { c } = useCommandCopy();
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="space-y-3 rounded-2xl rounded-bl-sm border border-c-edge/50 bg-c-deep/40 p-3.5 text-[13px] leading-relaxed text-white/85">
      {echo && (
        <p className="text-white/60">
          {c.youSaid} &ldquo;{echo.length > 140 ? echo.slice(0, 140) + "…" : echo}&rdquo;
        </p>
      )}
      <p className="font-medium text-white">{s.read}</p>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-c-2/80">{c.execution}</p>
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
          {c.bundle} · {engine.name} + {partner.name}
        </p>
        <p className="mt-1.5">{s.bundle.text}</p>
        <Link href={`/command/${partner.key}`} className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-c-2 hover:text-white">
          {c.openEngine} {partner.index} · {partner.name} <ArrowRight className="size-3.5 rtl:-scale-x-100" />
        </Link>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-c-2/80">{c.onceDeployed}</p>
        <ul className="mt-2 space-y-1.5">
          {s.notifications.map((n, i) => (
            <motion.li
              key={i}
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
        <p className="mt-1 text-[10.5px] text-white/40">{c.sampleProjection}</p>
      </div>
    </motion.div>
  );
}
