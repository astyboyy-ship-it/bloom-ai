"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gauge, SlidersHorizontal, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { EngineCommand } from "@/components/bloom/command/engine-command";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { useCommandCopy } from "@/components/bloom/command/locale";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { CalibrationHub } from "@/components/desk/calibration-hub";
import { EngineConsole } from "@/components/desk/engine-console";
import { EngineLock } from "@/components/desk/engine-lock";
import { HUB_COPY } from "@/components/desk/hub-copy";

type Tab = "console" | "command" | "calibration";
const TABS: { id: Tab; label: string; icon: typeof Terminal; blurb: string }[] = [
  { id: "console", label: "Run console", icon: Terminal, blurb: "Command the engine live" },
  { id: "command", label: "Command center", icon: Gauge, blurb: "The engine's full command center" },
  { id: "calibration", label: "Calibration", icon: SlidersHorizontal, blurb: "Model, limits, rules, memory, tools" },
];

/** One engine inside the OS: its live run console, the website's full command center, and its calibration bay. */
export function EngineWorkspace({ engine }: { engine: EngineKey }) {
  const { lang } = useCommandCopy();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("console");
  const e = ENGINES[engine];

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "command" || t === "calibration") setTab(t);
  }, []);

  const open = (t: Tab) => {
    setTab(t);
    const url = new URL(window.location.href);
    if (t === "console") url.searchParams.delete("tab");
    else url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url);
  };

  return (
    <div style={paletteVars(PALETTES[engine])} className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-os-line bg-os-panel/60 px-4 py-2 backdrop-blur-md">
        <Link href="/desk/engines" className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/50 hover:text-white">
          <ArrowLeft className="size-3.5 rtl:-scale-x-100" /> Engine network
        </Link>
        <span className="font-mono text-[11px] tracking-[0.2em] text-c-2">
          {e.index} · {e.name.toUpperCase()}
        </span>
        <div role="tablist" aria-label={`${e.name} views`} className="ms-auto flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              title={t.blurb}
              onClick={() => open(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                tab === t.id ? "border-c-1/50 bg-c-deep/70 text-c-2" : "border-transparent text-white/50 hover:text-white",
              )}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "console" && <EngineConsole engine={engine} />}

      {tab === "command" && (
        <EngineLock engine={engine} lang={lang} className="flex-1">
          {/* The transform makes this box the containing block for the command center's fixed painting layers,
              so the website's full experience runs inside the OS frame unchanged. */}
          <div className="relative h-[calc(100dvh-8.5rem)] overflow-y-auto [transform:translateZ(0)]">
            <EngineCommand key={engine} engineKey={engine} />
          </div>
        </EngineLock>
      )}

      {tab === "calibration" && <CalibrationHub c={HUB_COPY[lang]} lang={lang} selected={engine} onSelect={(k) => router.push(`/desk/engines/${k}?tab=calibration`)} />}
    </div>
  );
}
