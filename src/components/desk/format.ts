export const fmtMs = (ms: number) => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`);

export const fmtUsdCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(n);

export const fmtInt = (n: number) => new Intl.NumberFormat("en-US").format(n);

/** "02:14.3" style offset for log timestamps. */
export function fmtOffset(ms: number) {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}
