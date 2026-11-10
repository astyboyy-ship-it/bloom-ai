# Bloom AI: strategic audit and blueprint

*Audited 2026-11-10 at commit `1ad50d6`. Phase 0 status updated with the security hardening that followed.*

This is the reference for the next several months: what the system really does today, where it falls short of an enterprise-grade operations product, and the order we build it in. Findings come from reading the code and checking the production endpoints. The UI was not exercised in a browser for this audit, and Part 3 draws on general product knowledge rather than fresh market research.

## Summary

The surface is well ahead of the substance. About 42k of the repo's 57k lines (394 files) are UI; the engines and orchestrator are about 2.3k. None of the 23 engine tools touches a real system, the whole Operating Desk keeps its state in the browser, and there are no tests. The runtime core is well designed, so this is a demo shell around a solid kernel, not a rewrite.

## Phase 0 status

| Item | Status |
|---|---|
| Live model runs on the server's key required no license (production ran Claude Opus 5.5 via OpenRouter for anyone on the public domain) | **Done.** Server key is opt-in per run; only verified license keys under their daily spend caps run live. Everyone else gets deterministic simulation with a notice explaining why. |
| Rate limiting was per-instance memory, trivially bypassed | **Done.** Durable fixed-window limiter on Vercel KV / Upstash when configured (per-instance memory fallback), keyed by license key or IP. |
| No spend ceiling | **Done.** Daily caps per deployment (`BLOOM_DAILY_SPEND_CAP_USD`, default $20) and per key (`BLOOM_KEY_DAILY_SPEND_CAP_USD`, default $5), metered from real token usage at list price. |
| `schedule_shadow_job` claimed to schedule jobs it never scheduled | **Done.** Returns `source: "simulated"`, `scheduled: false`; CoreOps reports jobs as planned. |
| `/desk` on the production domain is public, no login | Open. Enable Vercel Deployment Protection on the production domain now; real auth in Phase 1. |
| One shared HMAC secret signs all license keys; no revocation | Open. Rotate `LICENSE_SIGNING_SECRET` now; Ed25519 keys and revocation in Phase 1. |
| No tests, no CI on pull requests, no error monitoring | Open. |

The spend caps and the shared rate limiter only work across serverless instances once Vercel KV (or Upstash Redis) is connected; without it each instance keeps its own counters.

## 1. Engines

### What is genuinely good

- **Contract** (`src/lib/engines/types.ts`): Zod-typed input and output per engine, tool inputs validated before execution, a shared output shape (summary, confidence, actions), and a deterministic simulation path for every engine.
- **Orchestrator** (`src/lib/orchestrator.ts`): delegation depth 2 with no cycles, 10 turns, per-engine latency cap, token budget, model fallback (OpenRouter model list or Anthropic's fallback beta), abort propagation, streamed run events, injection shield, pipelines that pass upstream summaries forward.

### Where it falls short

- **No tool does real work.** All 23 tools across the 8 engines (`src/lib/engines/01-…08-*.ts`) are pure functions over seeded data or fixed tables: no network, database or filesystem access. The simulated feeds say so honestly (`source: "simulated"`).
- **Usnavi, Lil API and Vijay are not engines.** They exist only as illustrative nodes in `src/components/control-plane/topology-map.tsx`. Decide what they are (real roles with contracts) or remove them before anything customer-facing.
- **No durable execution.** A run lives inside one HTTP request: no queue, no retry, no pause-for-approval-and-resume. Approvals are recorded after the fact, not enforced mid-run.
- **No server-side run store.** Runs, briefs, approvals and memory live in browser storage; on Vercel the trace log lives only as long as one instance.
- **Shallow memory.** Up to 10 recent summaries sent by the client; "vector memory" is local feature-hashing (lexical, and labeled as such), not retrieval.
- **No evaluation.** No golden sets, replay or regression scoring, so nothing tells us whether a prompt or model change made an engine better or worse.
- **No cost accounting** beyond the new spend guardrail: `costOf` in `src/lib/engines/models.ts` is used only by the testbed.

### Missing primitives, in build order

1. Tenancy and auth (Auth.js or Clerk) plus Postgres tables for runs, run events, approvals, memory, audit and policies. Extend the existing Prisma setup that serves `/workspaces`.
2. Connector layer: OAuth per system, typed clients, credentials in a vault, writes held for approval. First five: HubSpot or Salesforce, Stripe, Gmail or Outlook, Slack, QuickBooks.
3. Durable jobs (Inngest, Temporal or Upstash QStash) with pause-for-approval and resume; this is what makes `schedule_shadow_job` real.
4. Real retrieval: model embeddings and pgvector (the `DocumentChunk` model already exists).
5. Evaluation harness: frozen inputs per engine, schema and tool-call assertions, model-graded rubric, CI gate on regressions.
6. Cost and usage ledger per run, engine, model and tenant, with server-enforced budgets.

### Per-engine direction

| Engine | Upgrade |
|---|---|
| Sovereign | Persisted policy store; approvals that hold a run until a signed human decision; capacity allocation wired to the job queue |
| IntentPulse | Real ingestion (Reddit and X APIs, webhooks); enrichment from a data provider |
| CoreOps | Real drift checks across connected systems; real scheduled jobs |
| Apex, Vanguard | CRM read and write-back; sequences through an email provider, approval before send |
| Cortex | Call-transcript ingestion; battlecards grounded in retrieved documents |
| Shield | Account health from product analytics and billing |
| Aether | Pricing and discount analysis on Stripe data |

Simulation stays, as an explicit and labeled mode for demos and tests.

## 2. Operating Desk and Neural Control Plane

**Keep:** tier theming, strict three-language copy (en, es, he), honest labeling of simulated, sample and illustrative data, the license-guarded Control Plane, and the routing and prompt-bench controls that drive real behavior.

**Structural problems**

- All desk state is one JSON blob in localStorage (`src/components/desk/settings.ts`), rewritten in full on every change. Single device and single user; the SHA-256 audit chain can be recomputed by anyone who edits storage (it catches accidents, not tampering); RBAC is client-side only; provider API keys sit in browser storage, exposed to any XSS.
- About 89 `Math.random` calls drive UI motion. Engine load, threads and the pulse firehose are modeled, not measured. The labels are honest, but an operations suite needs real signals.
- Every settings change re-renders everything subscribed to the whole settings object.
- Rich per-run detail already exists as `RunEvent`s in `useRun` state but is only shown in the engine console and run drawer; the Control Plane's trace drawer shows a summary row, not spans.

**What turns it into an operations suite**

1. Run explorer: waterfall of agents, tool calls and delegations with timings, tokens, cost, inputs and outputs; replay; diff against the previous run; deep links.
2. Server-side metrics: p50, p95 and p99 latency, error rate, tokens and cost by engine, model and tenant, streamed over SSE instead of polled.
3. Approvals inbox with SLA timers, bulk actions and a signed decision trail.
4. Versioned policy editor with diff and "what would this have blocked last week".
5. Alerts and incidents on error rate and spend, with a timeline linking runs, traces and audit entries.
6. Speed and density: ⌘K command palette (none today), keyboard navigation, saved views, linkable drawers, virtualized logs, density toggle.
7. Cost panel: month-to-date against budget, most expensive prompts and engines.

## 3. Interaction model: borrowing from consumer leaders, carefully

What transfers: TikTok's one full-screen item with one primary action and a ranked next item (near-zero cost to the next decision); Reddit's visible community signal and threaded context; Apple's direct manipulation, spring physics and immediate tactile state changes; Epic's live-ops cadence and visible progression; OpenAI's streaming output as feedback and conversation with structured artifacts alongside.

**Proposal: the Decision Feed.** The unit is a pending decision (an approval, an anomaly, a drafted outreach, a policy breach), not content. Each card shows the evidence, the engine's confidence, the money at stake and why it is ranked where it is. Swipe or keyboard to approve, reject or delegate, with undo and a signature written to the audit trail. Rank by impact and urgency, with the reason always visible. Aim for an "inbox zero" end state and a weekly operating rhythm, not streaks. The Global Pulse architecture feed and its Fork / Clone already prove the gesture pattern.

**Guardrail:** optimize for time-to-decision, not time-in-app. Variable-reward loops, endless feeds and engagement-ranked ordering erode trust with enterprise buyers and their security reviewers. Authority comes from explainable ranking, reversibility and an audit trail; speed and fluid motion are fine.

## 4. Roadmap

### Phase 0 (weeks 1–2): secure and measure
Spend lockdown, durable rate limits and tool honesty (done). Still to do: protect or authenticate `/desk` on the production domain, rotate `LICENSE_SIGNING_SECRET`, connect Vercel KV, add Vitest and Playwright smoke tests with CI on every pull request, and add error monitoring.

### Phase 1 (months 1–2): foundation
Accounts and tenants. Desk state in Postgres: runs, events, approvals, audit with a server-held anchor, memory, policies. Provider keys in a vault. Ed25519-signed license keys (servers hold only the public key) with revocation. Durable jobs with pause-for-approval and resume.

### Phase 2 (months 2–4): real engines
Connector layer and the first five integrations. Evaluation harness in CI. Cost ledger. Real retrieval. Simulation as an explicit, labeled mode.

### Phase 3 (months 3–5): operations suite
Run explorer, server-side metrics over SSE, approvals inbox and Decision Feed, policy editor, alerts and incidents, ⌘K, deep links.

### Phase 4 (months 5–6): product decisions and distribution
- Decide whether Workflow Architect and the Operating Desk merge or split (today they are two products with separate data stacks).
- Decide what Usnavi, Lil API and Vijay are.
- Replace the private real-brand architecture showcase with blueprints from customers who agree to share them.
- Desktop: the app currently just loads the public site; add a bundled or offline-capable UI, code signing and auto-update.
