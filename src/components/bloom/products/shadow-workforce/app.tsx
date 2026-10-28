"use client";

import { useRef, useState } from "react";
import { AtSign, Code2, Copy, Download, ExternalLink, FileText, Globe, KeyRound, Link2, Monitor, RotateCw, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { classify, lockdown, seal, type Finding, type Target } from "@/lib/studio/foundry";
import { AGENTS, runSwarm, type AgentId, type Line, type Status } from "@/lib/studio/foundry-run";
import { download, usePersistent } from "../../studio/frame";
import { Hud, SpatialGraph, type Burst, type GraphEdge, type GraphNode } from "../graph";
import { CommandBar, glass, PanelHead, Segmented, Slider, Toggle, Sprig } from "../ui";
import { ShadowWorkforceShell } from "./shell";

type Delivered = { at: string; url: string; locked: boolean };
// audits and links are absent on vault entries saved before they existed.
/** The target's design system as the crawler found it on the live page. */
type Design = { colors: string[]; theme: string; fonts: string[]; ctas: string[]; headline: string };
type VaultItem = Omit<Target, "id"> & { id: string; builtAt: string | null; code: string; note: string; findings: Finding[]; lines: Line[]; audits?: { at: string; fixes: number }[]; links?: Delivered[]; design?: Design };

const EXPIRY: { value: string; label: string; ms: number | null }[] = [
  { value: "1d", label: "24 hours", ms: 86_400_000 },
  { value: "7d", label: "7 days", ms: 7 * 86_400_000 },
  { value: "30d", label: "30 days", ms: 30 * 86_400_000 },
  { value: "never", label: "No expiry", ms: null },
];

const VAULT_MAX = 8;
const LINKS_MAX = 6;
// The pipeline in plain words. Stage 4 writes standalone HTML and JavaScript, so it isn't called a React builder.
const STAGE: Record<AgentId, string> = { crawler: "Crawl", auditor: "Bottleneck Detective", architect: "Architecture Planner", builder: "Prototype Builder", qa: "Verification QA" };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const KIND_ICON = { url: Globe, handle: AtSign, brief: FileText };
const idle = (s: Status = "queued") => Object.fromEntries(AGENTS.map((a) => [a.id, s])) as Record<AgentId, Status>;

/** Ten characters from an alphabet without look-alikes, read aloud in two halves. */
function newPasscode() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(10));
  const s = [...b].map((x) => abc[x % abc.length]).join("");
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

/** Shadow Workforce: a vault of targets, five agents that build the fix, and an encrypted link to send. */
export function ShadowWorkforceApp() {
  const [vault, setVault] = usePersistent<VaultItem[]>("bloom.s3.vault", []);
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState(idle);
  const [lines, setLines] = useState<Line[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [code, setCode] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [lock, setLock] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [link, setLink] = useState<{ url: string; passcode?: string } | null>(null);
  const [pitch, setPitch] = useState("");
  const [expiry, setExpiry] = usePersistent("bloom.s3.expiry", "7d");
  const [allowDownload, setAllowDownload] = usePersistent("bloom.s3.allowDownload", true);
  const [threads, setThreads] = usePersistent("bloom.s3.threads", 4);
  const [inspecting, setInspecting] = useState<AgentId | "all">("all");
  const [burst, setBurst] = useState<Burst | null>(null);
  const [oColor, setOColor] = useState("");
  const [oFont, setOFont] = useState("");
  const fire = (path: string[]) => setBurst({ key: Date.now(), path });
  const runId = useRef(0);

  const item = vault.find((v) => v.id === selected) ?? null;
  const save = (id: string, patch: Partial<VaultItem>) => setVault((list) => list.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const show = (v: VaultItem) => {
    if (running) return;
    setSelected(v.id);
    setStatus(idle(v.code ? "done" : "queued"));
    setLines(v.lines);
    setFindings(v.findings);
    setCode(v.code);
    setPitch(v.note);
    setShowCode(false);
    setLink(null);
  };

  const build = async (target: VaultItem) => {
    const id = ++runId.current;
    setSelected(target.id);
    setStatus(idle());
    setLines([]);
    setFindings([]);
    setCode("");
    setShowCode(false);
    setLink(null);
    setRunning(target.id);
    const got: { lines: Line[]; findings: Finding[] } = { lines: [], findings: [] };
    fire(["target", "crawler", "auditor", "architect", "builder", "qa"]);
    const result = await runSwarm(target, {
      // More parallel threads shorten the simulated waits; 4 is the original pacing.
      pace: 2 / Math.sqrt(threads),
      alive: () => runId.current === id,
      status: (a, st) => setStatus((x) => ({ ...x, [a]: st })),
      line: (l) => {
        got.lines.push(l);
        setLines((x) => [...x, l]);
      },
      finding: (f) => {
        got.findings.push(f);
        setFindings((x) => [...x, f]);
      },
      code: setCode,
    });
    if (runId.current !== id) return;
    if (result) {
      const at = new Date().toISOString();
      setCode(result.html);
      setPitch(result.note);
      const f = result.facts;
      const design: Design = { colors: f.colors, theme: f.themeColor, fonts: f.fonts, ctas: f.ctas, headline: f.h1[0] ?? f.title };
      save(target.id, { code: result.html, note: result.note, findings: got.findings, lines: got.lines.slice(-60), builtAt: at, audits: [...(target.audits ?? []), { at, fixes: got.findings.length }].slice(-10), design });
    }
    setRunning(null);
  };

  const add = (raw = input) => {
    const s = raw.trim();
    if (!s || running) return;
    const t: VaultItem = { ...classify(s), id: `t-${Date.now().toString(36)}`, builtAt: null, code: "", note: "", findings: [], lines: [] };
    setVault((list) => [t, ...list].slice(0, VAULT_MAX));
    setInput("");
    build(t);
  };

  const remove = (id: string) => {
    if (running === id) return;
    setVault((list) => list.filter((v) => v.id !== id));
    if (selected === id) {
      setSelected(null);
      setCode("");
      setLines([]);
      setFindings([]);
    }
  };

  const share = async () => {
    if (!item) return;
    try {
      const code_ = lock ? passcode.trim() || newPasscode() : undefined;
      const ttl = EXPIRY.find((e) => e.value === expiry)?.ms ?? null;
      const frag = await seal({ t: item.name, h: code, n: pitch.replace("[link]", "this page"), ...(ttl ? { exp: Date.now() + ttl } : {}), dl: allowDownload }, code_);
      const url = `${window.location.origin}/engine-03/deliver#${frag}`;
      setLink({ url, passcode: code_ });
      save(item.id, { note: pitch, links: [{ at: new Date().toISOString(), url, locked: !!code_ }, ...(item.links ?? [])].slice(0, LINKS_MAX) });
      if (code_) setPasscode(code_);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Encrypted link copied");
    } catch {
      toast.error("This browser can't encrypt the link. Download the file instead.");
    }
  };

  const brand = /--brand:\s*(#[0-9a-f]{6})/i.exec(code)?.[1];
  const font = /--brand-font:\s*"([^"]+)"/.exec(code)?.[1];
  const design = item?.design;
  const tokens = design
    ? [":root {", ...[design.theme, ...design.colors].filter((c, i, a) => c && a.indexOf(c) === i).slice(0, 6).map((c, i) => `  --brand-${i + 1}: ${c};`), ...design.fonts.map((f, i) => `  --font-${i + 1}: "${f}";`), "}"].join("\n")
    : "";
  const isRunning = !!running && running === selected;

  /** Asset extraction overrides: rewrite the built prototype's brand colour and typeface. */
  const applyOverrides = () => {
    if (!item || !code) return;
    let c = code;
    if (/^#[0-9a-f]{6}$/i.test(oColor.trim())) c = c.replace(/--brand:\s*#[0-9a-f]{6}/i, `--brand: ${oColor.trim()}`).replace(/(<meta name="theme-color" content=")#[0-9a-f]{6}/i, `$1${oColor.trim()}`);
    const fontName = oFont.replace(/[^\p{L}\p{N}\s-]/gu, "").trim();
    if (fontName) c = c.replace(/--brand-font:\s*[^;]+;/, `--brand-font: "${fontName}";`);
    if (c === code) return toast.error("Enter a #rrggbb colour or a font name first.");
    setCode(c);
    save(item.id, { code: c });
    fire(["builder", "qa"]);
    toast.success("Prototype re-skinned with your overrides");
  };

  const agentMetric: Record<AgentId, string> = {
    crawler: item?.kind === "url" ? (design ? `${design.colors.length} colours · ${design.fonts.length} fonts` : "live page") : "no page to crawl",
    auditor: `${findings.length} findings`,
    architect: `${new Set(findings.map((x) => x.fix)).size} fixes planned`,
    builder: code ? `${Math.round(code.length / 1024)} KB` : "—",
    qa: status.qa === "done" ? "all checks passed" : status.qa === "failed" ? "checks failed" : status.qa,
  };
  const flow = (s: Status) => (s === "working" ? 1 : s === "done" ? 0.35 : s === "failed" ? 0.1 : 0.03);
  const POS: Record<AgentId, [number, number]> = { crawler: [215, 105], auditor: [385, 75], architect: [545, 165], builder: [705, 285], qa: [850, 180] };
  const nodes: GraphNode[] = [
    { id: "target", label: item ? item.name : "Target", x: 70, y: 215, metric: item ? item.kind : "pick one", sub: `${vault.length} in vault`, state: item ? "done" : "idle" },
    ...AGENTS.map((a) => ({ id: a.id, label: STAGE[a.id], x: POS[a.id][0], y: POS[a.id][1], metric: agentMetric[a.id], sub: `${threads} thread${threads === 1 ? "" : "s"}`, state: (status[a.id] === "working" ? "active" : status[a.id] === "done" ? "done" : status[a.id] === "failed" ? "warn" : "idle") as GraphNode["state"] })),
    { id: "delivery", label: "Encrypted delivery", x: 945, y: 310, metric: `${item?.links?.length ?? 0} links`, sub: lock ? "passcode lock" : "open link", state: item?.links?.length ? "done" : "idle" },
  ];
  const edges: GraphEdge[] = [
    { from: "target", to: "crawler", flow: flow(status.crawler) },
    { from: "crawler", to: "auditor", flow: flow(status.auditor) },
    { from: "auditor", to: "architect", flow: flow(status.architect) },
    { from: "architect", to: "builder", flow: flow(status.builder) },
    { from: "builder", to: "qa", flow: flow(status.qa) },
    { from: "qa", to: "delivery", flow: item?.links?.length ? 0.4 : code && !isRunning ? 0.15 : 0.03 },
  ];
  const inspectLines = inspecting === "all" ? lines : lines.filter((l) => l.agent === inspecting);

  const onCommand = (cmd: string): string | undefined => {
    const [verb, ...rest] = cmd.trim().split(/\s+/);
    const arg = rest.join(" ");
    switch (verb.toLowerCase()) {
      case "build":
        if (running) return "The swarm is busy with another target.";
        if (!arg) return "Usage: build <url | @handle | problem>";
        add(arg);
        return `Swarm dispatched on ${classify(arg).name} with ${threads} threads.`;
      case "rebuild":
        if (!item || running) return "Pick a target in the vault first.";
        build(item);
        return `Rebuilding ${item.name}.`;
      case "open": {
        const v = vault.find((x) => x.name.toLowerCase().startsWith(arg.toLowerCase()));
        if (!v) return `Nothing in the vault called “${arg}”.`;
        show(v);
        return `Opened ${v.name}.`;
      }
      case "inspect": {
        const a = AGENTS.find((x) => x.id.startsWith(arg.toLowerCase()) || STAGE[x.id].toLowerCase().startsWith(arg.toLowerCase()));
        if (!a) return "Agents: crawl, bottleneck, architecture, prototype, qa";
        setInspecting(a.id);
        return `Inspecting ${STAGE[a.id]}.`;
      }
      case "threads": {
        const n = Number(arg);
        if (!Number.isInteger(n) || n < 1 || n > 16) return "Usage: threads 1–16";
        setThreads(n);
        return `${n} parallel agent thread${n === 1 ? "" : "s"}.`;
      }
      case "link":
        if (!item || !code || isRunning) return "Build a target first.";
        share();
        return "Sealing an encrypted delivery link…";
      default:
        // Anything else is treated as a new target.
        if (running) return "The swarm is busy with another target.";
        add(cmd);
        return `Swarm dispatched on ${classify(cmd).name}.`;
    }
  };
  const built = !!code && !isRunning;

  return (
    <ShadowWorkforceShell
      title="Build the fix, skip the pitch."
      subtitle="Paste a company's website, @handle, or describe their problem. Five agents find what's broken and build a working fix in their brand colours, and you send it as an encrypted link."
      status={
        <span className="inline-flex items-center gap-2">
          <span className={cn("size-1.5 rounded-full", running ? "animate-pulse bg-p-accent" : "bg-p-text/30")} /> {running ? "Agents working" : `${vault.length} in the vault`}
        </span>
      }
    >
      <section aria-label="Agent swarm" className="-mx-6 lg:-mx-10">
        <SpatialGraph nodes={nodes} edges={edges} burst={burst} selected={inspecting === "all" ? null : inspecting} onNode={(id) => AGENTS.some((x) => x.id === id) && setInspecting(id as AgentId)}>
          <Hud className="left-6 top-3 lg:left-10" items={[{ label: "Swarm", value: running ? "executing" : item ? "standing by" : "idle" }, { label: "Parallel threads", value: String(threads) }]} />
          <Hud className="right-6 top-3 text-right lg:right-10" items={[{ label: "Findings", value: String(findings.length) }, { label: "Payload", value: code ? `${(code.length / 1024).toFixed(1)} KB` : "—" }]} />
        </SpatialGraph>
      </section>
      <div className="-mx-6 grid lg:-mx-10 xl:grid-cols-[290px_400px_minmax(0,1fr)] lg:grid-cols-[290px_minmax(0,1fr)]">
        <section className={cn(glass, "px-5 py-5")} aria-label="Target vault">
          <Sprig />
          <Sprig corner="br" />
          <p className="px-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-p-accent">Target vault</p>
          {vault.length ? (
            <ul className="mt-3 space-y-1">
              {vault.map((v) => {
                const Icon = KIND_ICON[v.kind];
                const active = v.id === selected;
                return (
                  <li key={v.id} className="group relative">
                    <button type="button" onClick={() => show(v)} disabled={!!running && running !== v.id} className={cn("flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-50", active ? "bg-p-accent/12 ring-1 ring-p-accent/40" : "hover:bg-p-text/5")}>
                      <Icon className="mt-0.5 size-4 shrink-0 text-p-text/50" />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] text-p-text">{v.name}</span>
                        <span className="block truncate text-[11.5px] text-p-text/45">
                          {running === v.id
                            ? "Building…"
                            : v.builtAt
                              ? `${v.audits?.length ?? 1} audit${(v.audits?.length ?? 1) === 1 ? "" : "s"} · ${v.findings.length} fixes · ${day(v.builtAt)}${v.links?.length ? ` · ${v.links.length} sent` : ""}`
                              : "Not built"}
                        </span>
                      </span>
                    </button>
                    {running !== v.id && (
                      <button type="button" onClick={() => remove(v.id)} aria-label={`Remove ${v.name}`} className="absolute right-2 top-2.5 rounded p-1 text-p-text/30 opacity-0 hover:text-p-second group-hover:opacity-100 focus:opacity-100">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 px-1 text-[13px] leading-relaxed text-p-text/45">Type a URL, @handle or problem in the command bar below. Targets you build are kept here, with their fixes, on this device.</p>
          )}
          <div className="mt-6 space-y-5 border-t border-p-edge/10 px-1 pt-5">
            <label className="block">
              <span className="flex justify-between text-[12.5px] text-p-text/70">
                Swarm threads <span className="prod-hud text-[12.5px]">{threads} parallel</span>
              </span>
              <Slider min={1} max={16} value={threads} onChange={setThreads} label="Parallel agent threads" className="mt-2" />
              <span className="mt-1 block text-[11px] text-p-text/40">More threads finish the agents&apos; work sooner. The crawl is a real request; the rest is paced.</span>
            </label>
            <div>
              <p className="text-[12.5px] text-p-text/70">Asset extraction overrides</p>
              <div className="mt-2 flex gap-2">
                <input value={oColor} onChange={(e) => setOColor(e.target.value)} placeholder={brand ?? "#rrggbb"} aria-label="Override brand colour" className="prod-field h-9 w-[110px] px-3 font-mono text-[12.5px]" />
                <input value={oFont} onChange={(e) => setOFont(e.target.value)} placeholder={font ?? "Typeface"} aria-label="Override typeface" className="prod-field h-9 min-w-0 flex-1 px-3 text-[12.5px]" />
              </div>
              <button type="button" disabled={!code || isRunning} onClick={applyOverrides} className="prod-ghost mt-2 h-9 w-full text-[12.5px]">
                Re-skin prototype
              </button>
            </div>
          </div>
        </section>

        {item ? (
          <>
            <section className={cn(glass, "flex flex-col overflow-hidden")} aria-label="Agent process inspector">
              <Sprig />
              <Sprig corner="br" />
              <div className="border-b border-p-edge/10 px-4 pb-3 pt-4">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-p-accent">Agent process inspector</p>
                <div className="mt-2">
                  <Segmented
                    size="sm"
                    label="Inspect agent"
                    value={inspecting}
                    onChange={setInspecting}
                    options={[{ value: "all" as const, label: "All" }, ...AGENTS.map((a) => ({ value: a.id, label: STAGE[a.id].split(" ")[0] }))]}
                  />
                </div>
                {inspecting !== "all" && (
                  <p className="mt-2 text-[12.5px] text-p-text/60">
                    <span className="text-p-text">{STAGE[inspecting]}</span> · {AGENTS.find((a) => a.id === inspecting)?.role.toLowerCase()} · <span className="prod-hud text-[12px]">{status[inspecting]}</span> · {agentMetric[inspecting]}
                  </p>
                )}
              </div>              <ol className="max-h-80 min-h-44 space-y-1.5 overflow-y-auto bg-black/45 p-4 font-mono text-[11.5px] leading-relaxed [text-shadow:0_0_10px_rgb(var(--p-glow)/0.45)]" aria-live="polite">
                {inspectLines.map((l, i) => (
                  <li key={i} className="animate-row-in">
                    <span className="text-p-second">{STAGE[l.agent].split(" ")[0].toLowerCase()}</span> <span className={l.tone === "err" ? "text-[#ff9daf]" : l.tone === "warn" ? "text-[#ffd59a]" : l.tone === "ok" ? "text-p-hi" : "text-p-text/75"}>{l.text}</span>
                  </li>
                ))}
                {!inspectLines.length && <li className="text-p-text/35">{inspecting === "all" ? "Waiting for the crawler…" : "No output from this agent yet."}</li>}
              </ol>
              {findings.length > 0 && (
                <div className="border-t border-p-edge/10 p-4">
                  <p className="font-display text-[18px] text-p-text">What&apos;s broken</p>
                  <ul className="mt-2 space-y-2">
                    {findings.map((f) => (
                      <li key={f.id} className="text-[13px] leading-snug text-p-text/75">
                        <span className={cn("mr-1.5 inline-block size-1.5 rounded-full align-middle", f.severity === "high" ? "bg-p-second" : "bg-p-accent")} />
                        {f.title} <span className="text-p-hi">→ {f.fix.toLowerCase()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!running && (
                <button type="button" onClick={() => build(item)} className="prod-ghost m-4 mt-auto h-10 text-[13px]">
                  <RotateCw className="size-4" /> Rebuild
                </button>
              )}
            </section>

            <section className={cn(glass, "flex min-h-[600px] flex-col overflow-hidden lg:col-span-2 xl:col-span-1")} aria-label="Preview">
              <Sprig />
              <Sprig corner="br" />
              <div className="flex flex-wrap items-center gap-3 border-b border-p-edge/10 px-4 py-2.5">
                <span className="font-display text-[19px] text-p-text">{item.name}</span>
                {brand && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-p-text/50">
                    <span className="size-3.5 rounded-full border border-white/25" style={{ background: brand }} /> {brand}
                  </span>
                )}
                {built && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-p-text/50" title={font ? "Renders in the target's typeface where it's installed; the file embeds no fonts." : undefined}>
                    <span className="text-[14px] text-p-text" style={{ fontFamily: font ? `"${font}", system-ui` : "system-ui" }}>
                      Aa
                    </span>{" "}
                    {font ?? "system type"}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <Segmented size="sm" label="Preview size" value={device} onChange={setDevice} options={[{ value: "desktop", label: <Monitor className="size-3.5" aria-label="Desktop" /> }, { value: "phone", label: <Smartphone className="size-3.5" aria-label="Phone" /> }]} />
                  <button type="button" disabled={!built} onClick={() => setShowCode((v) => !v)} className="inline-flex items-center gap-1.5 text-[12.5px] text-p-text/55 hover:text-p-text disabled:opacity-40">
                    <Code2 className="size-4" /> {showCode ? "Preview" : "Edit code"}
                  </button>
                </div>
              </div>
              {showCode ? (
                <textarea value={code} onChange={(e) => setCode(e.target.value)} onBlur={() => save(item.id, { code })} spellCheck={false} aria-label="Prototype code" className="min-h-0 flex-1 resize-none bg-black/55 p-4 font-mono text-[12px] leading-relaxed text-p-hi focus:outline-none" />
              ) : code ? (
                <div className="flex min-h-0 flex-1 justify-center bg-black/30">
                  <iframe title={`${item.name} prototype`} srcDoc={lockdown(isRunning ? "" : code)} sandbox="allow-scripts allow-forms" className={cn("min-h-0 bg-white transition-[width] duration-300", device === "phone" ? "my-4 w-[390px] rounded-2xl" : "w-full")} />
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-[14px] text-p-text/40">The working fix appears here.</div>
              )}
              {isRunning && code && <p className="border-t border-p-edge/10 px-4 py-2 text-[12px] text-p-text/50">Builder is writing the page… {Math.round(code.length / 1024)} KB</p>}
              {built && design && (
                <div className="border-t border-p-edge/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-p-second">Design system · extracted from the live page</span>
                    <button type="button" onClick={() => navigator.clipboard.writeText(tokens).then(() => toast.success("Design tokens copied as CSS"))} className="inline-flex items-center gap-1.5 text-[12.5px] text-p-text/60 hover:text-p-text">
                      <Copy className="size-3.5" /> Copy as CSS tokens
                    </button>
                  </div>
                  {design.colors.length || design.theme || design.fonts.length ? (
                    <div className="mt-3 flex flex-wrap items-start gap-x-8 gap-y-3">
                      <div>
                        <p className="text-[11.5px] text-p-text/45">Palette</p>
                        <div className="mt-1.5 flex gap-1.5">
                          {[design.theme, ...design.colors].filter((c, i, a) => c && a.indexOf(c) === i).slice(0, 6).map((c) => (
                            <span key={c} title={c} className="size-7 rounded-lg border border-white/20 shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]" style={{ background: c }} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11.5px] text-p-text/45">Type</p>
                        <p className="mt-1 text-[15px] text-p-text">{design.fonts.length ? design.fonts.join(" · ") : "System fonts"}</p>
                      </div>
                      {design.ctas.length > 0 && (
                        <div className="min-w-0">
                          <p className="text-[11.5px] text-p-text/45">Calls to action</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {design.ctas.slice(0, 4).map((c) => (
                              <span key={c} className="rounded-full border border-p-edge/15 px-2.5 py-0.5 text-[12px] text-p-text/75">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-[12.5px] text-p-text/45">No live page was crawled for this target (a handle or a written brief), so there&apos;s no design system to extract. The prototype uses a neutral palette.</p>
                  )}
                </div>
              )}
              {built && (
                <div className="space-y-3 border-t border-p-edge/10 p-4">
                  <label className="block">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-p-second">Handover note · [link] becomes the delivery link</span>
                    <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} onBlur={() => save(item.id, { note: pitch })} rows={5} aria-label="Handover note" className="prod-field mt-2 w-full resize-y p-3 text-[13.5px] leading-relaxed" />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={share} className="prod-btn h-11 rounded-xl px-5 text-[14.5px]">
                      <Link2 className="size-4" /> Create encrypted link
                    </button>
                    <button type="button" onClick={() => download(`${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-fix.html`, code, "text/html")} className="prod-ghost h-11 rounded-xl px-4 text-[14px]">
                      <Download className="size-4" /> Download
                    </button>
                    <label className="ml-auto flex items-center gap-2.5 text-[13px] text-p-text/70">
                      <Toggle on={lock} onChange={setLock} label="Lock with a passcode" /> Lock with a passcode
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-p-text/70">
                    <label className="flex items-center gap-2">
                      Link expires
                      <select value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-label="Link expiry" className="prod-field h-9 px-3 text-[13px]">
                        {EXPIRY.map((x) => (
                          <option key={x.value} value={x.value} className="bg-[#0b1224]">
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2.5">
                      <Toggle on={allowDownload} onChange={setAllowDownload} label="Allow source download" /> Allow source download
                    </label>
                  </div>
                  {lock && (
                    <div className="flex flex-wrap items-center gap-2">
                      <KeyRound className="size-4 text-p-accent" />
                      <input value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Generated when you create the link" aria-label="Passcode" className="prod-field h-9 w-64 px-3 font-mono text-[13px] tracking-wider" />
                      <button type="button" onClick={() => setPasscode(newPasscode())} className="text-[12.5px] text-p-text/55 hover:text-p-text">
                        New passcode
                      </button>
                    </div>
                  )}
                  {link && (
                    <div className="rounded-xl border border-p-edge/10 bg-black/30 p-3">
                      <p className="truncate font-mono text-[11.5px] text-p-text/60">{link.url}</p>
                      {link.passcode && (
                        <p className="mt-1.5 text-[12.5px] text-p-text/75">
                          Passcode <span className="font-mono text-p-hi">{link.passcode}</span>: send it separately (a text or a call), not in the same message.
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
                        <button type="button" onClick={() => navigator.clipboard.writeText(link.url).then(() => toast.success("Link copied"))} className="inline-flex items-center gap-1.5 text-p-text/75 hover:text-p-text">
                          <Copy className="size-3.5" /> Copy link
                        </button>
                        <button type="button" onClick={() => navigator.clipboard.writeText(pitch.replace("[link]", link.url)).then(() => toast.success("Note copied with the link"))} className="inline-flex items-center gap-1.5 text-p-text/75 hover:text-p-text">
                          <Copy className="size-3.5" /> Copy note with link
                        </button>
                        <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-p-text/75 hover:text-p-text">
                          <ExternalLink className="size-3.5" /> Open
                        </a>
                      </div>
                      <p className="mt-2 text-[11.5px] text-p-text/40">Encrypted with AES-256-GCM. The prototype lives inside the link itself; nothing is stored on a server.</p>
                    </div>
                  )}
                  {(item.links?.length ?? 0) > (link ? 1 : 0) && (
                    <div>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-p-text/45">Earlier links</p>
                      <ul className="mt-2 space-y-1">
                        {item.links!.slice(link ? 1 : 0).map((l) => (
                          <li key={l.url} className="flex items-center gap-3 text-[12.5px] text-p-text/60">
                            <span className="tabular-nums">{day(l.at)}</span>
                            <span>{l.locked ? "passcode" : "open link"}</span>
                            <button type="button" onClick={() => navigator.clipboard.writeText(l.url).then(() => toast.success("Link copied"))} className="ml-auto inline-flex items-center gap-1 hover:text-p-text">
                              <Copy className="size-3.5" /> Copy
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className={cn(glass, "flex min-h-[420px] flex-col items-center justify-center p-10 text-center xl:col-span-2")}>
            <Sprig />
            <Sprig corner="br" />
            <PanelHead title="Pick a target, or type one in the command bar" hint="Each build runs five agents in turn: Crawl, Bottleneck Detective, Architecture Planner, Prototype Builder and Verification QA. You can watch every step." />
          </section>
        )}
      </div>

      <CommandBar placeholder="acme.com · build @acmehq · inspect qa · threads 12 · link" hints={["build <url|@handle|problem>", "open <target>", "inspect <agent>", "threads <1-16>", "rebuild", "link"]} onRun={onCommand} />
    </ShadowWorkforceShell>
  );
}
