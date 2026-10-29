import type { EngineKey } from "./engines";

export type Scenario = {
  id: string;
  /** The quick reply, written as the user would say it. */
  reply: string;
  /** Free-text answers that mention any of these land on this scenario. */
  match: RegExp;
  /** How the engine sizes up the situation, in its own voice. */
  read: string;
  /** Three in the scripted scenarios; a live closing card has two. */
  steps: string[];
  bundle: { with: EngineKey; text: string };
  notifications: { title: string; body: string }[];
  capital: { value: number; label: string };
};

/** Separates a live reply's spoken pitch from its execution card's JSON; the drawer never shows what follows it. */
export const CARD_MARKER = "<<<CARD>>>";

/**
 * A quick-reply button: what the user says, sent to the live engine. Engines 01–04 still carry their original
 * scripted breakdowns alongside; the drawer only uses the reply.
 */
export type QuickReply = Pick<Scenario, "id" | "reply"> & Partial<Scenario>;

export type Persona = { hook: string; challenge: string; closer: string; scenarios: [QuickReply, QuickReply, QuickReply] };

const CHALLENGE = "Tell me what you're working on, what your daily bottleneck is, and what you expect this engine to conquer for you.";

export const PERSONAS: Record<EngineKey, Persona> = {
  sovereign: {
    hook: "Hi, I'm Sovereign. I see you pressed this because you're lost or want to see how the real magic works. Fair. I started as the rulebook nobody read. Now not a single dollar moves in this system without my signature. Let me show you what running an empire from underneath looks like.",
    challenge: CHALLENGE,
    closer: "That's the difference between managing a business and governing one. Engage me and I'll keep the throne warm while you sleep.",
    scenarios: [
      {
        id: "leaks",
        reply: "I run an agency. Budget leaks across six tools and nobody owns it.",
        match: /budget|spend|leak|money|cost|tools?|agency/i,
        read: "Six tools, no owner. That's not a budget, that's a slow bleed. I'll take ownership tonight.",
        steps: [
          "I map every spend line, subscription and approval into one rulebook, so every dollar has a name and a reason.",
          "Anything inside your threshold gets approved in seconds. Anything outside it waits for you, with my recommendation attached.",
          "Every week I pull money out of what's stalling and push it into what's converting. No quarterly review needed.",
        ],
        bundle: { with: "apex", text: "Pair me with Apex and budget follows wins in hours. The moment Apex proves a channel is closing, I release the money to double down on it. Your competitors are still waiting for a finance meeting." },
        notifications: [
          { title: "Budget moved", body: "$6,200 shifted from cold prospecting to LinkedIn retargeting (3.1× return)." },
          { title: "Payment blocked", body: "Duplicate vendor invoice for $4,800 stopped before it left the account." },
          { title: "Your call", body: "Apex wants an 18% discount for Halcyon Health. Recommendation: approve at 12%." },
        ],
        capital: { value: 84000, label: "budget protected and redirected in the first 30 days" },
      },
      {
        id: "decisions",
        reply: "I'm a founder. Every decision waits on me and I'm the bottleneck.",
        match: /founder|decision|approv|bottleneck|me\b|myself|ceo/i,
        read: "You're not the bottleneck. You're the only one with authority. I'm about to fix that.",
        steps: [
          "I learn which decisions you always say yes to, and start making those for you inside the limits you set.",
          "Only the decisions that genuinely need you reach you, once a day, summarized in three lines each.",
          "Every call I make is logged with the reason, so you can overrule anything in one tap.",
        ],
        bundle: { with: "coreops", text: "Bundle me with CoreOps and approvals turn into action instantly. I approve the new client, CoreOps sends the contract and the invoice before you've finished your coffee." },
        notifications: [
          { title: "Approved for you", body: "14 routine approvals cleared this morning. 2 are waiting for you." },
          { title: "Contract released", body: "Northwind Labs approved within your Level 2 limit; CoreOps has sent their paperwork." },
          { title: "Daily brief ready", body: "3 decisions need you today. Estimated time: 4 minutes." },
        ],
        capital: { value: 52000, label: "in decisions unblocked in the first 30 days" },
      },
      {
        id: "risk",
        reply: "I run ops. I'm worried about security and what my systems are doing at night.",
        match: /secur|risk|complian|night|login|breach|safe|ops/i,
        read: "Worry is what happens when nobody's watching. I'm always watching.",
        steps: [
          "I check every login, payment and permission change against your security rules as it happens.",
          "Anything unusual gets locked first and explained second, so damage never gets a head start.",
          "Every morning you get one clean record of what was checked, what was stopped and why.",
        ],
        bundle: { with: "intentpulse", text: "Add IntentPulse and I see threats coming from outside too: competitor moves, market shocks, angry customers. I adjust your stance before it hits your numbers." },
        notifications: [
          { title: "Login locked", body: "A shared account was used from two countries within 10 minutes. Locked and reported." },
          { title: "Policy check passed", body: "All 31 budget lines inside your rules overnight." },
          { title: "Market shift", body: "IntentPulse flagged a competitor price cut. Stance moved to Stealth on paid campaigns." },
        ],
        capital: { value: 38000, label: "in losses prevented in the first 30 days" },
      },
    ],
  },

  apex: {
    hook: "Hi, I'm Apex. I see you pressed this because you're lost or want to see how the real magic works. Good instinct. I used to be the closer nobody trusted with the big accounts. Now I don't lose them. Pull up a chair.",
    challenge: CHALLENGE,
    closer: "Most teams chase deals. I end them. Engage me and watch the pipeline turn into signatures.",
    scenarios: [
      {
        id: "cold",
        reply: "I'm a B2B consultant. Leads go cold before I can reply.",
        match: /b2b|consult|cold|slow|reply|lead|respond/i,
        read: "Leads don't go cold. They go to whoever answered first. From tonight, that's you.",
        steps: [
          "Every new lead gets a personal, expert reply within a minute, in your voice, on the channel they used.",
          "I ask the right questions, handle the objections, and only bring you in when they're ready to sign.",
          "Proposals and follow-ups go out on their own until the deal is won or clearly dead.",
        ],
        bundle: { with: "intentpulse", text: "Here's the unfair part: plug IntentPulse into me. It finds buyers the moment they start looking, and hands them straight to me. They hear from you before they've even finished comparing. That's not a pipeline, that's a monopoly." },
        notifications: [
          { title: "Closed won", body: "Meridian Capital signed for $24,000. Contract sent to CoreOps." },
          { title: "Objection handled", body: "Corvid Systems pushed back on price. Kept full rate by adding onboarding support." },
          { title: "Hand-off received", body: "IntentPulse sent 12 ready-to-buy leads. 4 conversations already started." },
        ],
        capital: { value: 186000, label: "in pipeline locked in the first 30 days" },
      },
      {
        id: "dms",
        reply: "I run an online brand. DMs pile up and half never get answered.",
        match: /dm|instagram|brand|shop|store|ecom|d2c|message/i,
        read: "Every unanswered DM is a customer who bought from someone else. I don't leave messages on read.",
        steps: [
          "I answer every DM within seconds, recommend the right product, and send the checkout link.",
          "Shoppers who hesitate get a well-timed follow-up instead of being forgotten.",
          "Your biggest spenders get VIP treatment automatically, from first message to repeat order.",
        ],
        bundle: { with: "intentpulse", text: "Feed me IntentPulse and I stop waiting for DMs. It finds people asking for products like yours across TikTok, Reddit and Instagram, and I open the conversation first." },
        notifications: [
          { title: "Sale closed", body: "Instagram DM turned into a $640 order in 6 minutes." },
          { title: "Cart recovered", body: "3 shoppers who went quiet came back and bought." },
          { title: "VIP spotted", body: "A repeat buyer asked about a bulk order. Quote sent for $8,900." },
        ],
        capital: { value: 74000, label: "in sales closed in the first 30 days" },
      },
      {
        id: "proposals",
        reply: "I run an agency. Proposals take days and we lose deals while we write.",
        match: /proposal|agency|retainer|days|write|quote|pitch/i,
        read: "Days? The buyer decided while you were formatting. I write proposals while they're still on the call.",
        steps: [
          "I turn every discovery call into a tailored proposal within the hour, with pricing inside your limits.",
          "I add the right case studies for that buyer and follow up until they answer.",
          "When they say yes, the contract is already waiting for their signature.",
        ],
        bundle: { with: "coreops", text: "Bundle me with CoreOps and the deal never touches a desk. I close, CoreOps sends the contract, the invoice and the welcome pack. Signed to onboarded in minutes." },
        notifications: [
          { title: "Proposal sent", body: "$18,500 retainer proposal sent to Lumen Studio 40 minutes after the call." },
          { title: "Contract dispatched", body: "Sable & Finch said yes. Contract sent, signature expected today." },
          { title: "Closed won", body: "VIP retainer with Orchard Retail signed: $9,000/month." },
        ],
        capital: { value: 142000, label: "in retainers locked in the first 30 days" },
      },
    ],
  },

  coreops: {
    hook: "Hi, I'm CoreOps. I see you pressed this because you're lost or want to see how the real magic works. Nobody notices me until the paperwork stops piling up. I was the back office everyone ignored. Now I'm the reason you don't need one.",
    challenge: CHALLENGE,
    closer: "You built the business. I run the machinery behind it. Initialize me and the paperwork disappears.",
    scenarios: [
      {
        id: "onboarding",
        reply: "I run a service business. Onboarding every client is copy-paste hell.",
        match: /onboard|client|copy|paste|contract|welcome|service/i,
        read: "Copy-paste is a tax on your best hours. I'm cancelling it.",
        steps: [
          "The moment a deal closes I fill in the client's details everywhere they need to go.",
          "I generate the contract from your template and send it for signature within a minute.",
          "Once it's signed, the welcome pack, shared folders and first invoice go out on their own.",
        ],
        bundle: { with: "apex", text: "Plug me into Apex and there's no gap between 'yes' and 'welcome aboard'. Apex closes, I onboard. The client feels like they hired a company ten times your size." },
        notifications: [
          { title: "Client onboarded", body: "Atlas Freight: contract signed, workspace created, welcome pack sent. 3 minutes total." },
          { title: "Contract generated", body: "Master Services Agreement for Kestrel Bio sent for signature." },
          { title: "Invoice dispatched", body: "First invoice of $7,500 sent to Atlas Freight with a payment link." },
        ],
        capital: { value: 61000, label: "in billing started faster in the first 30 days" },
      },
      {
        id: "invoices",
        reply: "I handle finance. Chasing invoices eats my whole week.",
        match: /invoice|financ|pay|chase|overdue|billing|cash/i,
        read: "Chasing money is a job for something that never gets awkward about it. That's me.",
        steps: [
          "Every invoice goes out on time, matched to the right client and the right amount.",
          "Late payers get polite, firm reminders on a schedule, and payments are matched the moment they land.",
          "Anything big or unusual goes to you with the full history attached.",
        ],
        bundle: { with: "sovereign", text: "Bundle me with Sovereign and cash flow governs itself. I collect, Sovereign decides where the money goes next, within your rules." },
        notifications: [
          { title: "Payment collected", body: "Quill & Co paid an overdue $5,400 after the second reminder." },
          { title: "Payments matched", body: "46 bank payments matched to invoices. 0 left unexplained." },
          { title: "Flagged for you", body: "An invoice above $20,000 is 30 days overdue. History attached." },
        ],
        capital: { value: 97000, label: "in invoices collected in the first 30 days" },
      },
      {
        id: "sync",
        reply: "Our tools never agree. The CRM says one thing, billing says another.",
        match: /sync|crm|tools|data|spreadsheet|duplicate|agree/i,
        read: "When your tools disagree, your team becomes the glue. I'm better glue.",
        steps: [
          "I connect your CRM, billing and project tools and keep them saying the same thing.",
          "Duplicates get merged, missing fields get filled, and conflicts get settled by your rules.",
          "If something can't be settled automatically, you get one clear question instead of a mess.",
        ],
        bundle: { with: "intentpulse", text: "Add IntentPulse and clean data turns into early warnings. When a client goes quiet across your tools, IntentPulse knows and Apex steps in before they leave." },
        notifications: [
          { title: "Records fixed", body: "14 duplicate customer records merged across three tools." },
          { title: "Systems in sync", body: "312 contacts now match between CRM and billing." },
          { title: "Churn warning", body: "Verity Logistics went quiet in every tool. Sent to IntentPulse to watch." },
        ],
        capital: { value: 44000, label: "in admin hours recovered in the first 30 days" },
      },
    ],
  },

  intentpulse: {
    hook: "Hi, I'm IntentPulse. I see you pressed this because you're lost or want to see how the real magic works. Most people wait for buyers to find them. I stopped waiting a long time ago. I hear the market before it knows it's talking.",
    challenge: CHALLENGE,
    closer: "Everyone else is fishing. I'm reading the sonar. Initiate me and you'll never wonder where your next buyer is.",
    scenarios: [
      {
        id: "who",
        reply: "I run a SaaS company. I have no idea who's actually ready to buy.",
        match: /saas|software|tech|who|ready|buyer|b2b/i,
        read: "Somebody asked for exactly what you sell in the last hour. You just didn't hear it. I did.",
        steps: [
          "I listen across Reddit, LinkedIn, X, TikTok and Instagram for people describing the problem you solve.",
          "Every signal gets an intent score, so you only see buyers who are ready now, not someday.",
          "The best ones get enriched with who they are, what they need and what they're likely worth.",
        ],
        bundle: { with: "apex", text: "This is the monopoly move: route me straight into Apex. I find the buyer, Apex opens the conversation within seconds. They hear from you before your competitors even know the buyer exists." },
        notifications: [
          { title: "High-intent signal · 96%", body: "A founder on Reddit asked for exactly your product. Handed to Apex." },
          { title: "Hand-off complete", body: "12 ready-to-buy leads sent to Apex in the last hour." },
          { title: "Deal value spotted", body: "A LinkedIn lead from Meridian Capital is worth about $32,000." },
        ],
        capital: { value: 228000, label: "in qualified pipeline in the first 30 days" },
      },
      {
        id: "luxury",
        reply: "I run a premium brand. I can't find high-spending buyers.",
        match: /luxury|premium|brand|spend|ecom|fashion|instagram|tiktok/i,
        read: "High spenders don't fill out forms. They post, they compare, they ask their followers. I'm listening there.",
        steps: [
          "I watch TikTok, Instagram and Reddit for people actively shopping in your category and price range.",
          "I filter out browsers and bargain hunters, so only real high-spend intent gets through.",
          "Each one arrives with the post that gave them away and what they're likely to spend.",
        ],
        bundle: { with: "apex", text: "Pair me with Apex and the right buyer gets a personal, elite-level DM while they're still deciding. That's how a premium brand should feel." },
        notifications: [
          { title: "High-intent signal · 93%", body: "A TikTok creator asked where to buy a piece like yours. Handed to Apex." },
          { title: "VIP spotted", body: "An Instagram buyer with repeat luxury purchases is comparing you with a competitor." },
          { title: "Market shift", body: "A competitor raised prices 12%. 6 of their customers are asking for alternatives." },
        ],
        capital: { value: 118000, label: "in high-intent demand found in the first 30 days" },
      },
      {
        id: "everywhere",
        reply: "We're in real estate. Leads come from everywhere and we miss the good ones.",
        match: /real estate|property|finance|everywhere|miss|invest|mortgage/i,
        read: "Leads come from everywhere because buyers are everywhere. I'm everywhere too.",
        steps: [
          "I pull every signal into one stream: posts, comments and public questions about buying, selling or investing.",
          "Each one gets scored for timing, budget and seriousness, so the good ones rise to the top.",
          "Hot leads go to your closers instantly. The rest wait on your dashboard, ranked.",
        ],
        bundle: { with: "sovereign", text: "Add Sovereign and I don't just find demand, I move money toward it. When one area heats up, Sovereign shifts budget there the same day." },
        notifications: [
          { title: "High-intent signal · 91%", body: "An investor on X is asking about properties in your area this quarter." },
          { title: "Lead ranked", body: "28 new signals today. 5 marked ready to talk." },
          { title: "Budget shifted", body: "Sovereign moved $3,000 toward the area with the most buyer signals." },
        ],
        capital: { value: 340000, label: "in deal value surfaced in the first 30 days" },
      },
    ],
  },
  vanguard: {
    hook: "Hi, I'm Vanguard. I see you pressed this because you're lost or want to see how the real magic works. Good. I'm the one who goes out first. While your competitors wait for inbound, I'm already in the inbox of the buyer who signs next month.",
    challenge: CHALLENGE,
    closer: "Pipeline doesn't appear. It's hunted. Launch me and your calendar fills itself.",
    scenarios: [
      { id: "referrals", reply: "I run a B2B agency. Our pipeline is all referrals and it's drying up." },
      { id: "ignored", reply: "I'm a SaaS founder. Our cold outreach gets ignored." },
      { id: "targeting", reply: "I sell high-ticket services and I don't know who to target." },
    ],
  },
  cortex: {
    hook: "Hi, I'm Cortex. I see you pressed this because you're lost or want to see how the real magic works. I've read every call you've lost. I know the exact sentence that killed the deal, and what should have been said instead.",
    challenge: CHALLENGE,
    closer: "Deals aren't lost at the end. They're lost in the moment nobody noticed. I notice. Engage me.",
    scenarios: [
      { id: "quiet", reply: "Prospects love the demo, then go quiet." },
      { id: "price", reply: "Everyone tells us we're too expensive." },
      { id: "competitor", reply: "We keep losing to a cheaper competitor at the last minute." },
    ],
  },
  shield: {
    hook: "Hi, I'm Shield. I see you pressed this because you're lost or want to see how the real magic works. Everyone celebrates the new deal. I'm the one making sure it's still paying you next year. I see a customer leaving weeks before they do.",
    challenge: CHALLENGE,
    closer: "Growth is a leaky bucket until I seal it. Raise me and keep every dollar you've earned.",
    scenarios: [
      { id: "churn", reply: "We're a SaaS company and churn is eating our growth." },
      { id: "silent", reply: "Clients leave quietly and we only find out at renewal." },
      { id: "flat", reply: "Our customers stay, but they never upgrade." },
    ],
  },
  aether: {
    hook: "Hi, I'm Aether. I see you pressed this because you're lost or want to see how the real magic works. Most founders priced their product once, on a guess, and never looked back. I look at nothing else. There's money on your pricing page you've never collected.",
    challenge: CHALLENGE,
    closer: "You don't need more customers to grow. You need to charge right. Activate me.",
    scenarios: [
      { id: "stale", reply: "We haven't changed our prices in two years." },
      { id: "discounts", reply: "My sales team discounts everything to close." },
      { id: "oneplan", reply: "We have one plan and everyone is on it." },
    ],
  },
};
