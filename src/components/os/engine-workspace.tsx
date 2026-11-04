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
const TABS: { id: Tab; icon: typeof Terminal }[] = [
  { id: "console", icon: Terminal },
  { id: "command", icon: Gauge },
  { id: "calibration", icon: SlidersHorizontal },
];

const COPY = {
  en: { back: "Engine network", views: (n: string) => `${n} views`, tabs: { console: ["Run console", "Command the engine live"], command: ["Command center", "The engine's full command center"], calibration: ["Calibration", "Model, limits, rules, memory, tools"] } as Record<Tab, [string, string]> },
  es: { back: "Red de motores", views: (n: string) => `Vistas de ${n}`, tabs: { console: ["Consola de ejecución", "Dirige el motor en vivo"], command: ["Centro de mando", "El centro de mando completo del motor"], calibration: ["Calibración", "Modelo, límites, reglas, memoria, herramientas"] } as Record<Tab, [string, string]> },
  he: { back: "רשת המנועים", views: (n: string) => `תצוגות של ${n}`, tabs: { console: ["קונסולת הרצה", "פיקוד על המנוע בזמן אמת"], command: ["מרכז פיקוד", "מרכז הפיקוד המלא של המנוע"], calibration: ["כיול", "מודל, מגבלות, כללים, זיכרון, כלים"] } as Record<Tab, [string, string]> },
} satisfies Record<"en" | "es" | "he", unknown>;

/** One engine inside the OS: its live run console, the website's full command center, and its calibration bay. */
export function EngineWorkspace({ engine }: { engine: EngineKey }) {
  const { lang } = useCommandCopy();
  const tx = COPY[lang];
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
          <ArrowLeft className="size-3.5 rtl:-scale-x-100" /> {tx.back}
        </Link>
        <span className="font-mono text-[11px] tracking-[0.2em] text-c-2">
          {e.index} · {e.name.toUpperCase()}
        </span>
        <div role="tablist" aria-label={tx.views(e.name)} className="ms-auto flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              title={tx.tabs[t.id][1]}
              onClick={() => open(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                tab === t.id ? "border-c-1/50 bg-c-deep/70 text-c-2" : "border-transparent text-white/50 hover:text-white",
              )}
            >
              <t.icon className="size-3.5" /> {tx.tabs[t.id][0]}
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
