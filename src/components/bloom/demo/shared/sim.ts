"use client";

import { useEffect, useRef } from "react";

/** Small seeded PRNG (mulberry32) so simulated streams feel random but stay cheap. */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(r: () => number, items: readonly T[]) => items[Math.floor(r() * items.length)];

/** Picks a key from a weight table, e.g. { a: 3, b: 1 }. */
export function weighted<K extends string>(r: () => number, weights: Record<K, number>): K {
  const entries = Object.entries(weights) as [K, number][];
  let roll = r() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) {
    roll -= w;
    if (roll <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

export const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo);

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

const compactFmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const compact = (n: number) => compactFmt.format(n);

export const clock = (d = new Date()) => d.toTimeString().slice(0, 8);

/** setInterval that pauses while the tab is hidden; pass null to stop. */
export function useInterval(callback: () => void, ms: number | null) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (ms === null) return;
    const id = setInterval(() => {
      if (!document.hidden) saved.current();
    }, ms);
    return () => clearInterval(id);
  }, [ms]);
}
