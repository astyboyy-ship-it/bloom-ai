import "server-only";
import { kv, kvConfig } from "@/lib/kv";
import type { ScoutRun } from "./types";

/**
 * Live Bloom Scout runs, kept for 30 days: Redis (the same Upstash / Vercel KV the desk already uses) when it is
 * configured, otherwise this instance's memory. Only live runs are stored; illustrative entries live in code.
 */
const TTL_S = 30 * 24 * 3600;
const KEEP = 50;
const memory = new Map<string, ScoutRun>();
const order: string[] = [];

export async function saveRun(run: ScoutRun): Promise<void> {
  if (run.mode !== "live") return;
  const cfg = kvConfig();
  if (cfg) {
    try {
      await kv(cfg, [["SET", `scout:run:${run.id}`, JSON.stringify(run), "EX", TTL_S], ["LREM", "scout:runs", 0, run.id], ["LPUSH", "scout:runs", run.id], ["LTRIM", "scout:runs", 0, KEEP - 1]]);
      return;
    } catch (err) {
      console.warn(`[scout] KV unavailable, keeping run ${run.id} in memory: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  memory.set(run.id, run);
  const at = order.indexOf(run.id);
  if (at >= 0) order.splice(at, 1);
  order.unshift(run.id);
  for (const id of order.splice(KEEP)) memory.delete(id);
}

export async function listRuns(limit = 20): Promise<ScoutRun[]> {
  const cfg = kvConfig();
  if (cfg) {
    try {
      const [ids] = (await kv(cfg, [["LRANGE", "scout:runs", 0, limit - 1]])) as [string[]];
      if (!ids?.length) return [];
      const [raw] = (await kv(cfg, [["MGET", ...ids.map((id) => `scout:run:${id}`)]])) as [(string | null)[]];
      return raw.flatMap((r) => (r ? [JSON.parse(r) as ScoutRun] : []));
    } catch {
      // Falls back to this instance's memory.
    }
  }
  return order.slice(0, limit).flatMap((id) => (memory.has(id) ? [memory.get(id)!] : []));
}

export async function getRun(id: string): Promise<ScoutRun | null> {
  const cfg = kvConfig();
  if (cfg) {
    try {
      const [raw] = (await kv(cfg, [["GET", `scout:run:${id}`]])) as [string | null];
      if (raw) return JSON.parse(raw) as ScoutRun;
    } catch {
      // Falls back to this instance's memory.
    }
  }
  return memory.get(id) ?? null;
}
