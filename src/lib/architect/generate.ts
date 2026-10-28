import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { ArchitectureSpecSchema, type ArchitectureSpec } from "./schema";

const ARCHITECT_SYSTEM = `You are a principal AI infrastructure architect. A professional describes their day-to-day workflow; you design the AI agent environment that will run it in production.

Design principles:
- Choose the simplest topology that fits. Use single_agent when one coherent context can do the job; use pipeline when work flows through distinct stages; use hierarchical when a planner must decompose work for specialists and an auditor must check it.
- Route by task shape, not prestige. Extraction, parsing, and classification go to the fast tier; synthesis to balanced; anything where an error is costly (financial judgment, security posture, compliance, final sign-off) to deep.
- Every system prompt you write must be usable as-is: name the domain, the inputs the agent receives, the standard its output must meet, and what it must refuse to guess about. Avoid generic filler.
- Recommend only integrations the workflow actually needs, with concrete config (endpoints as placeholders like https://<your-host>/..., chunking parameters, auth style).
- Enable RAG only when the user works from a corpus (filings, runbooks, contracts, codebases). Pick chunking to match the documents: markdown_headers for structured docs, recursive for prose, fixed for logs/tabular text.
- Set token budgets proportional to the work: max_tokens_per_request between 1024 and 16000, monthly_token_budget between 200000 and 50000000.
- Output schemas must be valid JSON Schema documents serialized as strings.`;

let client: Anthropic | undefined;
function anthropic() {
  client ??= new Anthropic({ apiKey: env().ANTHROPIC_API_KEY });
  return client;
}

export async function generateArchitecture(workflowDescription: string): Promise<ArchitectureSpec> {
  let response;
  try {
    response = await anthropic().messages.parse({
      model: env().ARCHITECT_MODEL,
      max_tokens: 20000,
      output_config: {
        effort: "high",
        format: zodOutputFormat(ArchitectureSpecSchema),
      },
      system: ARCHITECT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Design the AI environment for this workflow:\n\n<workflow>\n${workflowDescription}\n</workflow>`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      throw new HttpError(429, "Architect model is rate limited, retry shortly");
    }
    if (err instanceof Anthropic.AuthenticationError) {
      throw new HttpError(500, "Anthropic credentials are missing or invalid");
    }
    if (err instanceof Anthropic.APIError) {
      throw new HttpError(502, `Architect model error (${err.status}): ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new HttpError(
      422,
      `The architect declined this workflow${
        response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : ""
      }`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new HttpError(502, "Architecture spec was truncated; try a more focused description");
  }
  if (!response.parsed_output) {
    throw new HttpError(502, "Architect model returned an unparseable spec");
  }
  return normalize(response.parsed_output);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/** Enforces the constraints the structured-output schema can't express. */
export function normalize(spec: ArchitectureSpec): ArchitectureSpec {
  let agents = spec.agents;
  if (agents.length === 0) throw new HttpError(502, "Architect produced no agents");
  if (spec.topology.type === "single_agent") agents = agents.slice(0, 1);
  agents = agents.slice(0, 5);

  // Agent names must be unique per config.
  const seen = new Map<string, number>();
  agents = agents.map((a) => {
    const base = a.name.replace(/[^A-Za-z0-9_]/g, "") || "Agent";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...a, name: n === 1 ? base : `${base}${n}` };
  });

  const chunkSize = clamp(spec.rag.chunk_size, 200, 8000);
  return {
    ...spec,
    agents,
    routing: {
      ...spec.routing,
      max_tokens_per_request: clamp(spec.routing.max_tokens_per_request, 1024, 16000),
      monthly_token_budget: clamp(spec.routing.monthly_token_budget, 200_000, 50_000_000),
    },
    rag: {
      ...spec.rag,
      chunk_size: chunkSize,
      chunk_overlap: clamp(spec.rag.chunk_overlap, 0, Math.floor(chunkSize / 2)),
    },
  };
}

/** Parses a model-emitted JSON Schema string, falling back to a permissive schema. */
export function parseJsonSchema(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  return { type: "object", description: raw };
}
