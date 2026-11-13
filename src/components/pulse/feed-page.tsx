"use client";

import { useOnboardingCopy } from "@/components/onboarding/copy";
import { ArchitectureFeed } from "./architecture-feed";

/** /desk/feed: the architecture feed as its own top-level tab (the same feed is also a tab inside Global Pulse). */
export function FeedPage() {
  const p = useOnboardingCopy().pulse;
  return (
    <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">
      <p className="os-label bloom-glow">{p.pageKicker}</p>
      <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[36px]">{p.pageTitle}</h1>
      <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-white/55">{p.pageLede}</p>
      <div className="mt-6">
        <ArchitectureFeed />
      </div>
    </main>
  );
}
