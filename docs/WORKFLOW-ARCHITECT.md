# Workflow-Aware Infrastructure Architect

Describe your professional workflow → Claude architects a tailored AI environment (agent topology, domain system prompts, output schemas, model routing, tool + RAG recommendations) → run it from a Control Room or call it from any app through a personalized OpenRouter/LiteLLM gateway.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Prisma 6 + PostgreSQL + pgvector · Anthropic TypeScript SDK (`@anthropic-ai/sdk`)

## Setup

```powershell
# 1. Install Node.js 20.11+ (https://nodejs.org), open a new terminal, then:
powershell -ExecutionPolicy Bypass -File .\setup.ps1   # npm install, pin SDK, type-check, DB + migrations
# 2. Fill in .env (ANTHROPIC_API_KEY, OPENROUTER_API_KEY, optional EMBEDDINGS_API_KEY)
npm run dev
```

Manual equivalent: `npm install` → `cp .env.example .env` → `docker compose up -d postgres` → `npx prisma migrate deploy` → `npm run dev`.

## How it works

```
Onboarding wizard ──POST /api/architect──▶ Claude (messages.parse + Zod structured output)
                                              │  ArchitectureSpec: topology, agents, routing tiers,
                                              │  tool integrations, RAG strategy, JSON schemas
                                              ▼
                                   Postgres: Workspace / WorkflowConfig / AgentRole / VectorStoreReference
                                              │
          ┌───────────────────────────────────┼────────────────────────────────────┐
  Control Room (NDJSON)            POST /api/gateway (OpenAI-compatible)     POST /api/v1/run
  /api/workspaces/:id/run          per-agent, API-key auth                   full workflow, API-key auth
          └──────────────▶ lib/gateway: model chain + fallback ▶ OpenRouter  (or LiteLLM if LITELLM_BASE_URL)
                                     token cap per request · monthly budget · usage log (GatewayRequest)
```

- **Model routing.** The architect assigns each agent a tier (`fast` / `balanced` / `deep`). Tiers resolve to OpenRouter slug chains in `src/lib/gateway/models.ts`, which you can override with `MODEL_TIER_*` env vars. Claude never invents slugs. **Check the default slugs against https://openrouter.ai/models before production.**
- **Fallback.** Each request goes to the primary model and moves down the agent's fallback chain on 404/408/409/425/429/5xx. Streams commit to a model once the first byte arrives.
- **Hot-swap.** Edit models in the Agent Config tab (persisted), or pass `"model"` per request to the gateway (the configured chain stays as fallback).
- **Topologies.** `single_agent` runs one agent. In `pipeline`, each agent sees the previous agent's output. In `hierarchical`, each agent sees every prior output, so auditors and executors check the full chain.
- **RAG.** Uploads are chunked with the architect-chosen strategy and embedded with any OpenAI-compatible 1536-dim model. They're stored in `DocumentChunk.embedding vector(1536)` with an HNSW cosine index. The top 6 chunks go to the first agent and to researchers.
- **Webhooks.** `workflow.run.completed` is POSTed to the workspace webhook URL with `X-WFA-Signature: v1=HMAC_SHA256(secret, "<timestamp>.<body>")`.

## External API

```bash
# Per-agent completion (OpenAI-compatible body; "stream": true returns SSE)
curl $APP_URL/api/gateway -H "Authorization: Bearer wfa_live_..." -H "Content-Type: application/json" \
  -d '{"agent":"Researcher","messages":[{"role":"user","content":"..."}]}'

# Full workflow ("stream": true returns NDJSON events)
curl $APP_URL/api/v1/run -H "Authorization: Bearer wfa_live_..." -H "Content-Type: application/json" \
  -d '{"input":"..."}'

# Discover agents/routes for a key
curl $APP_URL/api/gateway -H "Authorization: Bearer wfa_live_..."
```

## Layout

```
prisma/schema.prisma, migrations/      data model + init SQL (pgvector extension, HNSW index)
src/lib/architect/                      spec schema (Zod), Claude call, persistence
src/lib/gateway/                        upstream client (OpenRouter/LiteLLM), routing, budgets, tiers
src/lib/rag/                            chunking strategies, embeddings, pgvector ingest/retrieve
src/lib/workflow/execute.ts             topology executor (shared by playground + /api/v1/run)
src/app/api/...                         architect, gateway, v1/run, workspaces/[id]/{config,keys,run,ingest}
src/components/onboarding/              multi-step wizard + spec review
src/components/dashboard/               Control Room, Agent Config inspector, API/Webhook export, Knowledge
```

## Before production

- **Auth:** `src/lib/auth.ts#getCurrentUser` is a single-owner stub keyed on `DEFAULT_USER_EMAIL`. Replace it with Auth.js, Clerk, or your IdP. Every page and route goes through this one function.
- **Rate limiting** on `/api/gateway` and `/api/v1/run` (per API key) is not included.
- **Long architect calls** need a host with a function duration of 300s or more (`maxDuration = 300`).
- **Migration drift:** Prisma can't express the HNSW index in the schema. If `prisma migrate dev` ever proposes dropping it, generate that migration with `--create-only` and remove the `DROP INDEX`.
