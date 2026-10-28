import { firstName, templateMessage } from "./outreach";
import { PLATFORMS, routeOf, signalScore, type PulseSignal } from "./signal";

/**
 * Deterministic, platform-native drafts for each channel view: a DM reply on Instagram, a public
 * value comment on Reddit (never a pitch), a quote-tweet on X, a creator reply on TikTok.
 * The dispatch API can redraft DMs with Groq; these are the instant, offline versions.
 */

export type ChannelDraft = { kind: "dm" | "reel-reply" | "value-comment" | "quote-tweet" | "creator-reply" | "none"; label: string; text: string };

const STACK_TOOLS = ["Salesforce", "HubSpot", "Snowflake", "Segment", "BigQuery", "Slack", "Zapier", "Okta", "Shopify", "Klaviyo", "AWS"];

function stackOf(s: PulseSignal) {
  return STACK_TOOLS.find((t) => s.text.toLowerCase().includes(t.toLowerCase()));
}

function topic(s: PulseSignal) {
  return s.keyword?.split(",")[0]?.trim() || "lead routing";
}

/** The template leaves `{{booking_link}}` for integrators; drafts shown in the app read better with a sample link. */
const SAMPLE_BOOKING_LINK = "cal.com/your-team/priority";

export function channelDraft(s: PulseSignal): ChannelDraft {
  const d = draftFor(s);
  return { ...d, text: d.text.replaceAll("{{booking_link}}", SAMPLE_BOOKING_LINK) };
}

function draftFor(s: PulseSignal): ChannelDraft {
  const route = routeOf(s);
  if (route === "quarantine") return { kind: "none", label: "Outreach suppressed", text: "Competitor recon: logged to the intel feed, no reply drafted." };

  const name = firstName(s.result.lead);
  const handle = s.author.handle || name;
  const stack = stackOf(s);
  const t = topic(s);
  const hot = route === "vip";

  switch (s.platform) {
    case "instagram":
      if (s.kind === "dm") {
        return { kind: "dm", label: hot ? "VIP DM · booking link" : "DM reply", text: templateMessage(hot ? "vip" : "outreach", s.result.lead, s.result.tier, s.result.persona, "Instagram")! };
      }
      return {
        kind: "reel-reply",
        label: "Reel reply + DM trigger",
        text: hot
          ? `${handle} this is exactly the setup we build. Sending you a DM with the breakdown and a priority slot 📩`
          : `${handle} great question! Just sent you a DM with the full ${t} breakdown 📩`,
      };
    case "reddit":
      return {
        kind: "value-comment",
        label: "Value comment · no link",
        text: [
          `Been through this exact ${t} problem.${stack ? ` If you're already on ${stack}, you're most of the way there.` : ""} What worked for us:`,
          `1. Score every inbound on budget, urgency, stack fit and authority, not on form fields alone.`,
          `2. Route anything with a real timeline to a human within 15 minutes; the rest goes to a nurture sequence.`,
          `3. Filter out competitors and students early so reps don't burn time.`,
          `Happy to share the scoring rubric we use if it helps.`,
        ].join("\n"),
      };
    case "x":
      return {
        kind: "quote-tweet",
        label: s.context?.mention ? "Reply to mention" : "Quote-tweet draft",
        text: hot
          ? `${handle} sent you a DM: we can have ${t} live for ${s.author.company || "your team"} ${signalScore(s, "urgency") >= 80 ? "inside your timeline" : "this quarter"}${stack ? `, wired into ${stack}` : ""}.`
          : `The fastest teams don't chase every lead; they score intent first. Here's how we'd approach ${t}${stack ? ` on ${stack}` : ""} in 2 weeks 🧵`,
      };
    case "tiktok":
      return {
        kind: "creator-reply",
        label: "Creator comment response",
        text: hot
          ? `${handle} yes! DM me "PULSE" and I'll send the exact playbook + a call link 🔥`
          : `${handle} full breakdown is pinned in my bio. Comment "PULSE" and I'll send it over 🙌`,
      };
    case "linkedin":
      return {
        kind: "dm",
        label: hot ? "LinkedIn message · booking link" : "LinkedIn message",
        text: hot
          ? `Hi ${name}, thanks for reaching out. Given your timeline${s.author.company ? ` at ${s.author.company}` : ""}, I've held a priority slot with our senior team: {{booking_link}}. Happy to work around your calendar.`
          : `Hi ${name}, appreciate the note. Teams${s.author.company ? ` like ${s.author.company}` : ""} usually start with a 20-minute call to map ${t}${stack ? ` on ${stack}` : ""}. Would one day this week work?`,
      };
    case "email":
      return {
        kind: "dm",
        label: "Email reply",
        text: `Subject: Re: ${t}\n\nHi ${name},\n\n${hot ? `Thanks for the detail. Given your timeline, I've held a priority slot for you: {{booking_link}}.` : `Thanks for getting in touch. The fastest way to see if we're a fit is a 20-minute call; reply with two times that work and I'll confirm one.`}\n\nBest,\nThe team`,
      };
    default:
      return { kind: "dm", label: `${PLATFORMS[s.platform].label} reply`, text: templateMessage(hot ? "vip" : "outreach", s.result.lead, s.result.tier, s.result.persona, "your form")! };
  }
}
