import "server-only";
import { extractBudgetK, scoreSignal, type Platform, type PulseSignal, type RawSignal, type SignalKind } from "@/lib/intentpulse/signal";

/**
 * Minimal Apify REST client for the IntentPulse radar. Runs one Actor per platform with
 * run-sync-get-dataset-items, then normalizes each platform's dataset shape into a RawSignal so
 * live payloads flow through exactly the same scoring pipeline as the simulator.
 * https://docs.apify.com/api/v2#/reference/actors/run-actor-synchronously-and-get-dataset-items
 */

const API = "https://api.apify.com/v2";

/** The channels an Apify Actor can sweep. LinkedIn, email and webhooks arrive by other routes. */
export type LivePlatform = Extract<Platform, "x" | "instagram" | "tiktok" | "reddit">;

type ActorSpec = {
  actor: string;
  input: (keywords: string[], limit: number) => Record<string, unknown>;
  normalize: (item: Item, keyword: string | undefined) => RawSignal | null;
};

type Item = Record<string, unknown>;

export function apifyConfig() {
  const token = process.env.APIFY_API_TOKEN?.trim() || null;
  return { token, live: process.env.USE_LIVE_APIFY === "true" && !!token, liveRequested: process.env.USE_LIVE_APIFY === "true" };
}

// --- defensive field access: Actor output shapes vary between versions ---
const str = (...vals: unknown[]) => {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
};
const num = (...vals: unknown[]) => {
  for (const v of vals) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/,/g, "")) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return 0;
};
const obj = (v: unknown): Item => (v && typeof v === "object" ? (v as Item) : {});
const iso = (v: unknown) => {
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : typeof v === "string" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
};
const clip = (s: string) => (s.length > 1200 ? `${s.slice(0, 1200)}…` : s);

function signal(platform: Platform, kind: SignalKind, actor: string, keyword: string | undefined, fields: {
  id: unknown;
  text: string;
  name: string;
  handle: string;
  verified: boolean;
  followers: number;
  bio?: string;
  url: string;
  postedAt: unknown;
  likes?: number;
  replies?: number;
  context?: RawSignal["context"];
}): RawSignal | null {
  if (!fields.text) return null;
  return {
    context: fields.context,
    id: `${platform}-${str(fields.id) || Math.random().toString(36).slice(2)}`,
    platform,
    kind,
    author: {
      name: fields.name || fields.handle || "Unknown",
      handle: fields.handle,
      verified: fields.verified,
      followers: fields.followers,
      // Bios rarely say the company; keep the first clause as the author's title/company hint.
      title: fields.bio ? fields.bio.split(/[|·\n]/)[0].slice(0, 80) : undefined,
      company: "",
    },
    text: clip(fields.text),
    url: fields.url || null,
    postedAt: iso(fields.postedAt),
    budgetK: extractBudgetK(fields.text),
    engagement: { likes: fields.likes ?? 0, replies: fields.replies ?? 0 },
    origin: "apify",
    actor,
    keyword,
  };
}

const ACTORS: Record<LivePlatform, ActorSpec> = {
  x: {
    // "apify/twitter-scraper" no longer exists on the Apify Store; Tweet Scraper V2 takes the same input.
    actor: process.env.APIFY_ACTOR_TWITTER || "apidojo/tweet-scraper",
    input: (keywords, limit) => ({ searchTerms: keywords, maxItems: limit, maxTweets: limit, sort: "Latest", tweetLanguage: "en" }),
    normalize: (it, kw) => {
      const a = obj(it.author ?? it.user);
      const handle = str(a.userName, a.screen_name, a.username);
      return signal("x", it.isReply ? "comment" : "post", ACTORS.x.actor, kw, {
        id: it.id ?? it.id_str,
        text: str(it.fullText, it.full_text, it.text),
        name: str(a.name),
        handle: handle ? `@${handle}` : "",
        verified: Boolean(a.isBlueVerified ?? a.isVerified ?? a.verified),
        followers: num(a.followers, a.followers_count),
        bio: str(a.description),
        url: str(it.url, it.twitterUrl, handle && (it.id ?? it.id_str) ? `https://x.com/${handle}/status/${it.id ?? it.id_str}` : ""),
        postedAt: it.createdAt ?? it.created_at,
        likes: num(it.likeCount, it.favorite_count),
        replies: num(it.replyCount, it.reply_count),
        context: { mention: /@\w+/.test(str(it.fullText, it.full_text, it.text)) },
      });
    },
  },
  instagram: {
    actor: process.env.APIFY_ACTOR_INSTAGRAM || "apify/instagram-hashtag-scraper",
    input: (keywords, limit) => ({ hashtags: keywords.map((k) => k.replace(/[^\p{L}\p{N}_]/gu, "")).filter(Boolean), resultsLimit: limit }),
    normalize: (it, kw) => {
      const handle = str(it.ownerUsername);
      return signal("instagram", "post", ACTORS.instagram.actor, kw, {
        id: it.id ?? it.shortCode,
        text: str(it.caption),
        name: str(it.ownerFullName, handle),
        handle: handle ? `@${handle}` : "",
        verified: Boolean(it.isVerified ?? obj(it.owner).is_verified),
        followers: num(it.ownerFollowersCount, obj(it.owner).followersCount),
        url: str(it.url, it.shortCode ? `https://www.instagram.com/p/${it.shortCode}/` : ""),
        postedAt: it.timestamp,
        likes: num(it.likesCount),
        replies: num(it.commentsCount),
        context: { reel: str(it.caption).split("\n")[0].slice(0, 60) || "Instagram post" },
      });
    },
  },
  tiktok: {
    actor: process.env.APIFY_ACTOR_TIKTOK || "clockworks/free-tiktok-scraper",
    input: (keywords, limit) => ({
      hashtags: keywords.map((k) => k.replace(/[^\p{L}\p{N}_]/gu, "")).filter(Boolean),
      resultsPerPage: limit,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    }),
    normalize: (it, kw) => {
      const a = obj(it.authorMeta);
      const handle = str(a.name, a.uniqueId);
      return signal("tiktok", "post", ACTORS.tiktok.actor, kw, {
        id: it.id,
        text: str(it.text, it.desc),
        name: str(a.nickName, a.nickname, handle),
        handle: handle ? `@${handle}` : "",
        verified: Boolean(a.verified),
        followers: num(a.fans, a.followerCount),
        bio: str(a.signature),
        url: str(it.webVideoUrl),
        postedAt: it.createTimeISO ?? it.createTime,
        likes: num(it.diggCount),
        replies: num(it.commentCount),
        context: { video: str(it.text, it.desc).slice(0, 60) || "TikTok video" },
      });
    },
  },
  reddit: {
    actor: process.env.APIFY_ACTOR_REDDIT || "trudax/reddit-scraper-lite",
    input: (keywords, limit) => ({ searches: keywords, sort: "new", maxItems: limit, maxPostCount: limit, searchPosts: true, searchComments: false, skipComments: true }),
    normalize: (it, kw) => {
      const handle = str(it.username, it.author);
      const title = str(it.title);
      const body = str(it.body, it.text, it.selftext);
      return signal("reddit", it.dataType === "comment" ? "comment" : "thread", ACTORS.reddit.actor, kw, {
        id: it.id ?? it.parsedId,
        text: [title, body].filter(Boolean).join(" — "),
        name: handle,
        handle: handle ? `u/${handle}` : "",
        verified: false,
        followers: 0,
        url: str(it.url, it.link),
        postedAt: it.createdAt ?? it.created_utc,
        likes: num(it.upVotes, it.score),
        replies: num(it.numberOfComments, it.num_comments),
        context: { subreddit: str(it.communityName, it.parsedCommunityName, it.subreddit).replace(/^r\//, "") || undefined },
      });
    },
  },
};

export const actorFor = (p: LivePlatform) => ACTORS[p].actor;

export class ApifyError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** Runs an Actor synchronously and returns its default dataset items. */
export async function runActorSync(actor: string, input: Record<string, unknown>, token: string, timeoutSecs = 50): Promise<Item[]> {
  const url = `${API}/acts/${actor.replace("/", "~")}/run-sync-get-dataset-items?timeout=${timeoutSecs}&clean=true&format=json`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout((timeoutSecs + 8) * 1000),
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: { message?: string } };
      detail = j.error?.message ?? "";
    } catch {}
    throw new ApifyError(`${actor} returned ${res.status}${detail ? `: ${detail}` : ""}`, res.status);
  }
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as Item[]) : [];
}

/** Reads the items of an existing dataset, e.g. from an Apify run-succeeded webhook. */
export async function datasetItems(datasetId: string, token: string, limit = 100): Promise<Item[]> {
  const res = await fetch(`${API}/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new ApifyError(`Dataset ${datasetId} returned ${res.status}`, res.status);
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as Item[]) : [];
}

/** Maps raw Actor items for a platform into scored signals, skipping anything without text. */
export function normalizeItems(platform: LivePlatform, items: Item[], keyword?: string): PulseSignal[] {
  const out: PulseSignal[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const raw = ACTORS[platform].normalize(it, keyword);
    if (!raw || seen.has(raw.id)) continue;
    seen.add(raw.id);
    out.push(scoreSignal(raw));
  }
  return out;
}

export type SweepRun = { platform: LivePlatform; actor: string; count: number; ms: number; error?: string };

/** Runs every requested platform's Actor in parallel. A failing platform never sinks the sweep. */
export async function liveSweep(platforms: LivePlatform[], keywords: string[], perPlatform: number, token: string) {
  const runs = await Promise.all(
    platforms.map(async (platform): Promise<{ run: SweepRun; signals: PulseSignal[] }> => {
      const spec = ACTORS[platform];
      const started = Date.now();
      try {
        const items = await runActorSync(spec.actor, spec.input(keywords, perPlatform), token);
        const signals = normalizeItems(platform, items.slice(0, perPlatform), keywords.join(", "));
        return { run: { platform, actor: spec.actor, count: signals.length, ms: Date.now() - started }, signals };
      } catch (err) {
        const error = err instanceof Error ? err.message : "Actor run failed";
        return { run: { platform, actor: spec.actor, count: 0, ms: Date.now() - started, error }, signals: [] };
      }
    }),
  );
  return { runs: runs.map((r) => r.run), signals: runs.flatMap((r) => r.signals) };
}
