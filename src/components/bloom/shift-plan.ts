import { ENGINE_ORDER, type EngineKey } from "./command/engines";

/**
 * The Dynamic Shift Topology plan, shared by the landing page, the Operating Desk and Sovereign's capacity tool.
 * Kept out of the client component so server code can import it as plain data.
 */
export type ShiftMode = "prime" | "dark" | "surge";

/**
 * How each shift spreads its compute across the engines (shares sum to 100), and how many nodes it runs.
 * Prime leans on closing, Dark on ingestion and hygiene, Surge doubles capacity toward signals and closers.
 */
export const SHIFTS: Record<ShiftMode, { nodes: number; share: Record<EngineKey, number> }> = {
  prime: { nodes: 64, share: { intentpulse: 10, vanguard: 12, apex: 22, cortex: 20, aether: 8, coreops: 10, shield: 8, sovereign: 10 } },
  dark: { nodes: 48, share: { intentpulse: 22, vanguard: 18, apex: 4, cortex: 8, aether: 10, coreops: 16, shield: 14, sovereign: 8 } },
  surge: { nodes: 128, share: { intentpulse: 24, vanguard: 6, apex: 26, cortex: 18, aether: 8, coreops: 6, shield: 4, sovereign: 8 } },
};
export const SHIFT_MODES: ShiftMode[] = ["prime", "dark", "surge"];
export const GRID = 128;

/** Whole-node counts per engine that add up to the shift's total (largest remainders get the leftovers). */
export function allocate(mode: ShiftMode): Record<EngineKey, number> {
  const { nodes, share } = SHIFTS[mode];
  const raw = ENGINE_ORDER.map((k) => ({ k, v: (share[k] / 100) * nodes }));
  const out = Object.fromEntries(raw.map(({ k, v }) => [k, Math.floor(v)])) as Record<EngineKey, number>;
  let left = nodes - raw.reduce((s, { v }) => s + Math.floor(v), 0);
  for (const { k } of [...raw].sort((a, b) => (b.v % 1) - (a.v % 1))) if (left-- > 0) out[k]++;
  return out;
}

/** The grid lists engines' nodes in order; cells past the shift's total stay dark. */
export function gridCells(base: Record<EngineKey, number>): (EngineKey | null)[] {
  const out: (EngineKey | null)[] = [];
  for (const k of ENGINE_ORDER) for (let i = 0; i < base[k]; i++) out.push(k);
  while (out.length < GRID) out.push(null);
  return out.slice(0, GRID);
}

/** The shift that runs on the clock at a given hour; Surge is event-driven, never scheduled. */
export const clockShift = (hour: number): ShiftMode => (hour >= 8 && hour < 19 ? "prime" : "dark");
