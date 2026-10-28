"use client";

import { Check, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { money, USAGE_RIGHTS, type UsageRightsKey } from "@/lib/aware-marketing/engine";
import { CATEGORIES, DEFAULT_CRITERIA, fit, USAGE_ORDER, type Category, type Criteria } from "@/lib/studio/deals";
import { Button } from "../../command-center/kit";
import { Field, inputCls, PageBar, Panes, PaneSection } from "../frame";
import { useMarketing } from "./store";

type CatState = "allowed" | "neutral" | "blocked";

/** Brand criteria rule builder, with every rule's effect on tonight's proposals shown live. */
export function RulesPage() {
  const m = useMarketing();
  const c = m.criteria;
  const set = (patch: Partial<Criteria>) => m.setCriteria((x) => ({ ...x, ...patch }));
  const stateOf = (cat: Category): CatState => (c.blocked.includes(cat) ? "blocked" : c.allowed.includes(cat) ? "allowed" : "neutral");
  const setCat = (cat: Category, s: CatState) =>
    set({ allowed: s === "allowed" ? [...c.allowed.filter((x) => x !== cat), cat] : c.allowed.filter((x) => x !== cat), blocked: s === "blocked" ? [...c.blocked.filter((x) => x !== cat), cat] : c.blocked.filter((x) => x !== cat) });

  const passing = m.rows.filter((r) => !r.f.blocked && r.f.score >= c.minMatch);
  const defaults = m.sweep.map((p) => fit(p, DEFAULT_CRITERIA)).filter((f) => !f.blocked && f.score >= DEFAULT_CRITERIA.minMatch).length;

  return (
    <>
      <PageBar
        icon={SlidersHorizontal}
        accent="#ffc36b"
        title="Brand criteria"
        meta={`${passing.length} of ${m.sweep.length} of tonight's proposals pass these rules (defaults: ${defaults})`}
        actions={
          <Button size="sm" variant="ghost" onClick={() => m.setCriteria(DEFAULT_CRITERIA)}>
            <RotateCcw className="size-3.5" /> Reset to defaults
          </Button>
        }
      />
      <Panes
        rightWidth={380}
        right={
          <PaneSection title="Effect on tonight's sweep">
            <ul className="space-y-1">
              {m.rows.map(({ p, f }) => {
                const pass = !f.blocked && f.score >= c.minMatch;
                const failed = f.reasons.filter((r) => !r.ok).map((r) => r.label);
                return (
                  <li key={p.id} className="rounded-md px-2 py-1.5 text-[12.5px] hover:bg-white/[0.03]">
                    <span className="flex items-center gap-2">
                      {pass ? <Check className="size-3.5 text-[#9fd3a8]" /> : <X className="size-3.5 text-[#ff9d90]" />}
                      <span className={pass ? "text-white/90" : "text-white/50"}>{p.brand}</span>
                      <span className="text-[11px] text-white/35">{p.category}</span>
                      <span className="ml-auto tabular-nums text-white/55">{f.blocked ? "banned" : f.score}</span>
                    </span>
                    {!pass && <span className="ml-5 block text-[11px] text-white/40">{f.blocked ? `${p.category} is banned` : failed.length ? failed.join(" · ") : `Match below ${c.minMatch}`}</span>}
                  </li>
                );
              })}
            </ul>
          </PaneSection>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#0b0a0e]/60 p-4">
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
            <Card title="Fee floors">
              <Field label="Minimum fee for any deal">
                <input type="number" step={250} min={0} className={inputCls} value={c.minBudget} onChange={(e) => set({ minBudget: Math.max(0, Number(e.target.value) || 0) })} />
              </Field>
              <p className="mt-3 text-[11.5px] text-white/50">Category floors (override the minimum when higher)</p>
              <ul className="mt-1.5 space-y-1.5">
                {CATEGORIES.filter((cat) => stateOf(cat) !== "blocked").map((cat) => (
                  <li key={cat} className="flex items-center gap-2">
                    <span className="w-20 text-[12.5px] text-white/75">{cat}</span>
                    <input
                      type="number"
                      step={250}
                      min={0}
                      placeholder={money(c.minBudget)}
                      className={cn(inputCls, "flex-1")}
                      value={c.categoryFloors[cat] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0);
                        const next = { ...c.categoryFloors };
                        if (v === undefined) delete next[cat];
                        else next[cat] = v;
                        set({ categoryFloors: next });
                      }}
                    />
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Categories">
              <ul className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <li key={cat} className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] text-white/80">{cat}</span>
                    <span className="inline-flex rounded-md border border-white/[0.08] bg-black/20 p-0.5">
                      {(["allowed", "neutral", "blocked"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setCat(cat, s)}
                          className={cn(
                            "h-6 rounded px-2 text-[11px]",
                            stateOf(cat) === s ? (s === "allowed" ? "bg-[#ffc36b]/20 text-[#ffd59a]" : s === "blocked" ? "bg-[#ff7b6b]/20 text-[#ffb3a8]" : "bg-white/[0.1] text-white") : "text-white/40 hover:text-white",
                          )}
                        >
                          {s === "allowed" ? "Allow" : s === "blocked" ? "Ban" : "Neutral"}
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-white/35">Banned categories never reach your review. Neutral ones score lower on fit.</p>
            </Card>

            <Card title="Usage rights">
              <Field label="Most I'll grant without a human">
                <select className={inputCls} value={c.maxUsage} onChange={(e) => set({ maxUsage: e.target.value as UsageRightsKey })}>
                  {USAGE_ORDER.map((u) => (
                    <option key={u} value={u} className="bg-[#16141b]">
                      {USAGE_RIGHTS[u].label}
                    </option>
                  ))}
                </select>
              </Field>
              <ol className="mt-3 space-y-1 text-[12px]">
                {USAGE_ORDER.map((u) => (
                  <li key={u} className={cn("flex justify-between", USAGE_ORDER.indexOf(u) <= USAGE_ORDER.indexOf(c.maxUsage) ? "text-white/80" : "text-white/35 line-through")}>
                    <span>{USAGE_RIGHTS[u].short}</span>
                    <span className="tabular-nums">+{Math.round(USAGE_RIGHTS[u].markup * 100)}% premium</span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card title="Exclusivity & bar">
              <label className="flex items-center gap-2 text-[12.5px] text-white/80">
                <input type="checkbox" checked={c.allowExclusivity} onChange={(e) => set({ allowExclusivity: e.target.checked })} className="accent-[#ffc36b]" /> Accept category exclusivity clauses
              </label>
              <p className="mt-1 text-[11px] text-white/40">When off, any proposal with an exclusivity or non-compete clause fails the fit check.</p>
              <Field label={`Minimum match score · ${c.minMatch}`}>
                <input type="range" min={0} max={100} value={c.minMatch} onChange={(e) => set({ minMatch: Number(e.target.value) })} className="mt-2 w-full accent-[#ffc36b]" />
              </Field>
              <p className="mt-1 text-[11px] text-white/40">Match = 55% deal quality (fee vs floor, clause risk) + 45% fit with these rules.</p>
            </Card>
          </div>
        </div>
      </Panes>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/[0.08] bg-[#121116]/90 p-4">
      <h2 className="mb-3 text-[13px] font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
