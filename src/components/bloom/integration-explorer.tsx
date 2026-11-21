"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ARCHITECTURES } from "@/lib/architectures";
import { INTEGRATIONS, statusesOf, type Group, type IntegrationNode, type Point, type Product, type Status } from "@/lib/integrations";
import { ENGINES } from "./command/engines";
import { PALETTES, paletteVars } from "./command/theme";
import { useExchangeScoutCopy } from "./exchange-scout-copy";
import { useI18n } from "./i18n";

const GROUPS: Group[] = ["engines", "architectures", "platform"];

const BADGE: Record<Status, string> = {
  live: "border-[#8fe3c0]/45 text-[#a8f0d0]",
  new: "border-sun/50 text-sun",
  skipped: "border-white/15 text-white/40",
};

function Badge({ status }: { status: Status }) {
  const c = useExchangeScoutCopy().explorer;
  return <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em]", BADGE[status])}>{c.status[status]}</span>;
}

function nodeName(node: IntegrationNode, lang: "en" | "es" | "he"): string {
  if (node.group === "engines") return ENGINES[node.id].name;
  if (node.group === "architectures") return ARCHITECTURES.find((a) => a.slug === node.id)?.name ?? node.id;
  return node.name[lang];
}

function PointView({ point, product }: { point: Point; product: Product }) {
  const { lang } = useI18n();
  const c = useExchangeScoutCopy().explorer;
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-4">
      <Badge status={point.status} />
      <dl className="mt-3 grid gap-3 text-[13.5px] leading-relaxed">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{c.fields.upgrade}</dt>
          <dd className="mt-1 text-white/85">{point.upgrade[lang]}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{product === "exchange" ? c.fields.proof : c.fields.handoff}</dt>
          <dd className="mt-1 text-white/70">{point.mechanics[lang]}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{c.fields.where}</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5" dir="ltr">
            {point.where.map((w) => (
              <code key={w} className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[11px] text-white/60">
                {w}
              </code>
            ))}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Details({ node, product }: { node: IntegrationNode; product: Product }) {
  const { lang } = useI18n();
  const c = useExchangeScoutCopy().explorer;
  if (node.group === "architectures") {
    return (
      <div className="grid gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{c.fields.via}</p>
        {node.via.length ? (
          <ul className="grid gap-2">
            {node.via.map((v) => (
              <li key={`${v.engine}-${v.tool}`} style={paletteVars(PALETTES[v.engine])} className="flex flex-wrap items-center gap-2 rounded-xl border border-c-edge/50 bg-black/30 px-3 py-2.5 text-[13.5px] text-white/80">
                <Badge status={v.status} />
                {c.archVia(ENGINES[v.engine].name, v.tool)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] text-white/60">{c.archNone[product]}</p>
        )}
        <p className="flex flex-wrap gap-1.5" dir="ltr">
          {ARCHITECTURES.find((a) => a.slug === node.id)?.engines.map((k) => (
            <span key={k} style={paletteVars(PALETTES[k])} className={cn("rounded-full border px-2 py-0.5 font-mono text-[10.5px]", node.via.some((v) => v.engine === k) ? "border-c-1/60 text-c-2" : "border-white/10 text-white/35")}>
              {ENGINES[k].name}
            </span>
          ))}
        </p>
      </div>
    );
  }
  if (!node.points.length) {
    return (
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{c.fields.why}</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/65">{node.group === "engines" ? node.skipped?.[lang] : null}</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {node.points.map((p, i) => (
        <PointView key={i} point={p} product={product} />
      ))}
      {node.group === "platform" && node.href && (
        <a href={node.href} target={node.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 rounded-full border border-rose/40 px-3 py-1.5 text-[12.5px] text-rose hover:bg-rose/10">
          {c.open} <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
        </a>
      )}
    </div>
  );
}

/**
 * "Where it's incorporated": every engine, architecture and platform layer, each a button that expands in place to
 * show what the product changes there, how it's proven, and where in the code. Data: src/lib/integrations.ts.
 */
export function IntegrationExplorer({ product }: { product: Product }) {
  const { lang, dir } = useI18n();
  const c = useExchangeScoutCopy().explorer;
  const base = useId();
  const [group, setGroup] = useState<Group>("engines");
  const [open, setOpen] = useState<string | null>(null);
  const nodes = INTEGRATIONS[product].filter((n) => n.group === group);

  return (
    <div lang={lang} dir={dir} className="glass mx-auto mt-16 max-w-6xl rounded-[28px] p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h3 className="text-balance text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">{c.title[product]}</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/55">{c.lede[product]}</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-white/50">
          {(["live", "new", "skipped"] as const).map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <Badge status={s} /> {c.legend[s]}
            </li>
          ))}
        </ul>
      </div>

      <div role="tablist" aria-label={c.title[product]} className="mt-6 inline-flex flex-wrap rounded-full border border-white/10 p-0.5">
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            id={`${base}-tab-${g}`}
            aria-selected={group === g}
            aria-controls={`${base}-panel`}
            onClick={() => {
              setGroup(g);
              setOpen(null);
            }}
            className={cn("rounded-full px-4 py-1.5 text-[13px] transition-colors", group === g ? "bg-rose/15 text-rose" : "text-white/60 hover:text-white")}
          >
            {c.groups[g]}
          </button>
        ))}
      </div>

      <ul id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${group}`} className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {nodes.map((node) => {
          const key = `${node.group}:${node.id}`;
          const expanded = open === key;
          const statuses = statusesOf(node);
          const skipped = statuses[0] === "skipped";
          const panelId = `${base}-${node.group}-${node.id}`;
          const palette = node.group === "engines" ? paletteVars(PALETTES[node.id]) : undefined;
          return (
            <li key={key} className={cn(expanded && "sm:col-span-2 lg:col-span-4")}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : key)}
                style={palette}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose",
                  expanded ? "border-rose/50 bg-rose/[0.06]" : "border-white/10 bg-white/[0.02] hover:border-white/25",
                  skipped && !expanded && "opacity-60",
                )}
              >
                {node.group === "engines" && <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-c-1/60 bg-c-deep font-mono text-[10px] text-c-2">{ENGINES[node.id].index}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-white">{nodeName(node, lang)}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {statuses.map((s) => (
                      <Badge key={s} status={s} />
                    ))}
                  </span>
                </span>
                <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-white/45 transition-transform", expanded && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    id={panelId}
                    role="region"
                    aria-label={nodeName(node, lang)}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3">
                      <Details node={node} product={product} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
