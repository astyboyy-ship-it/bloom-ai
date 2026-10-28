import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // The Anthropic SDK also resolves ANTHROPIC_AUTH_TOKEN / `ant auth login`
  // profiles, so the key is optional here.
  ANTHROPIC_API_KEY: z.string().optional(),
  ARCHITECT_MODEL: z.string().default("claude-opus-5-5"),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  // When set, all gateway traffic goes through a LiteLLM proxy instead of OpenRouter.
  LITELLM_BASE_URL: z.string().url().optional(),
  LITELLM_API_KEY: z.string().optional(),

  // OpenAI-compatible embeddings endpoint for RAG ingestion (1536-dim model).
  EMBEDDINGS_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  EMBEDDINGS_API_KEY: z.string().optional(),
  EMBEDDINGS_MODEL: z.string().default("text-embedding-3-small"),

  // Optional per-tier overrides: comma-separated OpenRouter slugs, primary first.
  MODEL_TIER_FAST: z.string().optional(),
  MODEL_TIER_BALANCED: z.string().optional(),
  MODEL_TIER_DEEP: z.string().optional(),

  APP_URL: z.string().url().default("http://localhost:3000"),
  DEFAULT_USER_EMAIL: z.string().email().default("owner@localhost.dev"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment configuration:\n${parsed.error.issues
          .map((i) => `  ${i.path.join(".")}: ${i.message}`)
          .join("\n")}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
