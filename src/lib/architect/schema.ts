import { z } from "zod";

// Kept within the JSON Schema subset structured outputs supports: no numeric
// bounds or string length constraints — those are enforced in normalize().
// Free-form JSON Schemas are carried as strings because they are arbitrarily nested.

export const TierSchema = z
  .enum(["fast", "balanced", "deep"])
  .describe(
    "fast = high-volume parsing/extraction/classification; balanced = drafting and synthesis; deep = multi-step reasoning, auditing, high-stakes judgment",
  );

export const AgentSpecSchema = z.object({
  name: z.string().describe("Short PascalCase identifier, e.g. MarketResearcher"),
  role: z.enum(["planner", "researcher", "auditor", "executor", "specialist"]),
  responsibility: z.string().describe("One or two sentences on what this agent owns"),
  system_prompt: z
    .string()
    .describe(
      "Complete, production-ready system prompt written for this domain. Second person, concrete about inputs, quality bar, and what to hand off.",
    ),
  tier: TierSchema,
  tools: z
    .array(z.string())
    .describe("Names of tool_integrations entries this agent may use"),
  output_schema: z
    .string()
    .describe("A JSON Schema (serialized as a JSON string) for this agent's output"),
});

export const ArchitectureSpecSchema = z.object({
  domain: z.string().describe("Normalized name of the professional domain"),
  summary: z.string().describe("Three to five sentences describing the generated environment"),
  topology: z.object({
    type: z.enum(["single_agent", "hierarchical", "pipeline"]),
    rationale: z.string(),
  }),
  orchestrator_prompt: z
    .string()
    .describe("System prompt for the coordinator that frames the overall workflow"),
  agents: z
    .array(AgentSpecSchema)
    .describe("Agents in execution order. Exactly one for single_agent; two to five otherwise."),
  routing: z.object({
    rules: z.array(
      z.object({
        task_type: z.string(),
        tier: TierSchema,
        rationale: z.string(),
      }),
    ),
    max_tokens_per_request: z.number().int(),
    monthly_token_budget: z.number().int(),
  }),
  tool_integrations: z.array(
    z.object({
      kind: z.enum(["vector_db", "web_scraper", "webhook", "api_connector", "code_runner"]),
      name: z.string(),
      purpose: z.string(),
      config: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
  ),
  rag: z.object({
    enabled: z.boolean(),
    strategy: z.enum(["fixed", "recursive", "markdown_headers", "semantic"]),
    chunk_size: z.number().int().describe("Characters per chunk"),
    chunk_overlap: z.number().int().describe("Characters of overlap"),
    rationale: z.string(),
  }),
  final_output_schema: z
    .string()
    .describe("JSON Schema (serialized as a JSON string) for the workflow's final deliverable"),
});

export type ArchitectureSpec = z.infer<typeof ArchitectureSpecSchema>;
export type AgentSpec = z.infer<typeof AgentSpecSchema>;
