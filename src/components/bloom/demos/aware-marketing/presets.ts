import type { DealInput } from "@/lib/aware-marketing/engine";

export type Preset = { id: string; name: string; hint: string; input: DealInput };

export const PRESETS: Preset[] = [
  {
    id: "lowball",
    name: "Low-Ball Sponsor Offer",
    hint: "Under floor · Net 60 · boosted posts",
    input: {
      brandName: "Lumora Skincare",
      creatorName: "Ava Laurent",
      budget: 5500,
      deliverables: "1x YouTube Integration + 2x IG Reels",
      usageRights: "paid30",
      tone: "warm",
      emailText:
        "Hi Ava!\n\nWe absolutely LOVE your content and think you'd be the perfect face for our new Dew Serum launch. We have $5,500 set aside for a 60-90s YouTube integration plus two Instagram Reels. We'd also love to boost the Reels on our paid channels for about a month.\n\nOur standard payment terms are Net 60 after posting. Could we get the first video live within the next three weeks?\n\nWarmly,\nPriya, Partnerships @ Lumora",
    },
  },
  {
    id: "enterprise",
    name: "High-Ticket Enterprise Deal",
    hint: "Multi-channel · clean terms · above floor",
    input: {
      brandName: "Northwind Audio",
      creatorName: "Ava Laurent",
      budget: 28000,
      deliverables: "1x YouTube Dedicated Video + 2x IG Reels + 3x IG Stories + 1x Newsletter Feature",
      usageRights: "paid90",
      tone: "direct",
      emailText:
        "Hello Ava,\n\nNorthwind Audio is launching the Aria Pro headphones in Q1 and we'd like you as a lead launch partner. Proposed scope: one dedicated YouTube review, two Reels, three Story frames and a newsletter feature. Total fee $28,000 with 90 days of paid social amplification on the Reels.\n\nPayment Net 30, two rounds of revisions, and you keep full creative direction; we only check product claims.\n\nBest regards,\nMarcus Hale, Global Creator Programs",
    },
  },
  {
    id: "rights",
    name: "Aggressive Usage Rights Request",
    hint: "Perpetual all-media · exclusivity · Net 90",
    input: {
      brandName: "Halcyon Apparel",
      creatorName: "Ava Laurent",
      budget: 9500,
      deliverables: "1x TikTok Video + 1x IG Reel + 2x IG Stories",
      usageRights: "perpetual",
      tone: "direct",
      emailText:
        "Hi Ava,\n\nWe're offering $9,500 for a TikTok, a Reel and two Stories. As standard, Halcyon requires usage rights in perpetuity across all media (including OOH and broadcast), whitelisting access, and 12-month exclusivity against any competitor in fashion.\n\nWe'll need unlimited revisions until the content is approved and our team will have final approval on the cut. Payment is Net 90.\n\nThanks,\nJordan, Brand Marketing @ Halcyon",
    },
  },
];
