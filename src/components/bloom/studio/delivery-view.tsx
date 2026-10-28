"use client";

import { useEffect, useState } from "react";
import { Download, KeyRound, Loader2 } from "lucide-react";
import { lockdown, needsPasscode, openDelivery, type Delivery } from "@/lib/studio/foundry";
import { BloomWordmark } from "../logo";
import { download } from "./frame";

/** Opens a Solution Foundry delivery link: the prototype is decrypted and unpacked from the URL fragment, in the browser. */
export function DeliveryView() {
  const [d, setD] = useState<Delivery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);

  const open = async (frag: string, code?: string) => {
    const x = await openDelivery(frag, code);
    if (typeof x.h !== "string" || typeof x.t !== "string") throw new Error();
    if (typeof x.exp === "number" && Date.now() > x.exp) {
      setLocked(false);
      setError(`This prototype link expired on ${new Date(x.exp).toLocaleString()}. Ask the sender for a new one.`);
      return;
    }
    setD(x);
    setLocked(false);
    document.title = `${x.t} · prototype from Bloom AI`;
  };

  useEffect(() => {
    const frag = window.location.hash.slice(1);
    if (!frag) return setError("This delivery link is incomplete: the part after “#” is missing.");
    if (needsPasscode(frag)) return setLocked(true);
    open(frag).catch(() => setError("This delivery link couldn't be opened. It may have been cut off when it was copied."));
  }, []);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await open(window.location.hash.slice(1), passcode);
    } catch {
      setError("That passcode doesn't open this prototype. Check it with whoever sent you the link.");
    }
    setBusy(false);
  };

  return (
    <div className="flex h-dvh flex-col bg-[#0d0c10] text-white">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/[0.08] px-4 py-2.5">
        <BloomWordmark className="text-[17px]" />
        <span className="text-[12.5px] text-white/55">{d ? `Working prototype prepared for ${d.t}` : "Solution delivery"}</span>
        {d?.exp && <span className="text-[11.5px] text-white/40">Available until {new Date(d.exp).toLocaleDateString()}</span>}
        {d && d.dl !== false && (
          <button type="button" onClick={() => download(`${d.t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-fix.html`, d.h, "text/html")} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-[#e9cf98] px-3 text-[12.5px] font-medium text-[#17110a] hover:bg-[#f3dfb4]">
            <Download className="size-3.5" /> Download the source
          </button>
        )}
      </header>
      <p className="shrink-0 border-b border-[#e9cf98]/20 bg-[#e9cf98]/[0.06] px-4 py-1.5 text-[11.5px] text-[#f0d9a8]">
        Built by a Bloom AI user with the Solution Foundry; Bloom AI didn&apos;t write or review it. The page below runs offline: it can&apos;t send anything you type anywhere. Never enter passwords.
      </p>
      {d?.n && <p className="shrink-0 whitespace-pre-line border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[12.5px] leading-relaxed text-white/70">{d.n}</p>}
      {d ? (
        <iframe title={`${d.t} prototype`} srcDoc={lockdown(d.h)} sandbox="allow-scripts allow-forms" className="min-h-0 w-full flex-1 bg-white" />
      ) : locked ? (
        <form onSubmit={unlock} className="m-auto w-full max-w-sm px-6 text-center">
          <KeyRound className="mx-auto size-6 text-[#e9cf98]" />
          <p className="mt-3 text-[15px] text-white/85">This prototype is encrypted.</p>
          <p className="mt-1 text-[13px] text-white/50">Enter the passcode the sender gave you separately.</p>
          <input value={passcode} onChange={(e) => setPasscode(e.target.value)} autoFocus aria-label="Passcode" className="mt-5 h-11 w-full rounded-lg border border-white/15 bg-black/30 px-4 text-center font-mono text-[15px] tracking-[0.2em] text-white focus:border-[#e9cf98]/60 focus:outline-none" />
          <button type="submit" disabled={!passcode.trim() || busy} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#e9cf98] text-[14px] font-medium text-[#17110a] disabled:opacity-50">
            {busy && <Loader2 className="size-4 animate-spin" />} Unlock
          </button>
          {error && <p className="mt-3 text-[12.5px] text-[#ffb3a8]">{error}</p>}
        </form>
      ) : (
        <p className="m-auto max-w-md px-6 text-center text-[13px] text-white/55">{error ?? "Opening the prototype…"}</p>
      )}
    </div>
  );
}
