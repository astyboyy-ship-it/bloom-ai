import "server-only";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";

/** OpenAI-compatible chat types (the wire format OpenRouter and LiteLLM share). */
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type Usage = { prompt_tokens: number; completion_tokens: number };

export type ChatChunk = {
  id?: string;
  model?: string;
  choices?: { index: number; delta?: { content?: string | null }; finish_reason?: string | null }[];
  usage?: Usage;
};

export interface UpstreamRequest {
  /** Ordered candidates: primary first, then fallbacks. */
  models: string[];
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface CompletionResult {
  content: string;
  usage: Usage;
  servedModel: string;
  attempts: number;
}

export interface StreamResult {
  servedModel: string;
  attempts: number;
  chunks: AsyncGenerator<ChatChunk>;
}

/** Statuses where a different model/endpoint may succeed. 404 covers a hot-swapped slug that doesn't exist. */
const FALLBACK_STATUSES = new Set([404, 408, 409, 425, 429, 500, 502, 503, 504, 529]);
const HEADERS_TIMEOUT_MS = 60_000;

function provider(): { name: "litellm" | "openrouter"; baseUrl: string; headers: Record<string, string> } {
  const e = env();
  if (e.LITELLM_BASE_URL) {
    return {
      name: "litellm",
      baseUrl: e.LITELLM_BASE_URL.replace(/\/$/, ""),
      headers: e.LITELLM_API_KEY ? { Authorization: `Bearer ${e.LITELLM_API_KEY}` } : {},
    };
  }
  if (!e.OPENROUTER_API_KEY) throw new HttpError(500, "OPENROUTER_API_KEY is not configured");
  return {
    name: "openrouter",
    baseUrl: e.OPENROUTER_BASE_URL.replace(/\/$/, ""),
    headers: {
      Authorization: `Bearer ${e.OPENROUTER_API_KEY}`,
      "HTTP-Referer": e.APP_URL,
      "X-Title": "Workflow Architect Gateway",
    },
  };
}

async function attempt(model: string, req: UpstreamRequest, stream: boolean): Promise<Response> {
  const p = provider();
  // Abort only while waiting for headers; a streaming body may legitimately run longer.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("upstream timeout")), HEADERS_TIMEOUT_MS);
  const onAbort = () => controller.abort(req.signal?.reason);
  req.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    return await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...p.headers },
      body: JSON.stringify({
        model,
        messages: req.messages,
        max_tokens: req.maxTokens,
        temperature: req.temperature,
        stream,
        ...(stream ? { stream_options: { include_usage: true } } : {}),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tries each candidate model in order. Returns the first successful response;
 * throws an HttpError summarizing every failed attempt otherwise.
 */
async function withFallback(req: UpstreamRequest, stream: boolean) {
  if (req.models.length === 0) throw new HttpError(400, "No models configured for this route");
  const failures: { model: string; status?: number; error: string }[] = [];

  for (const [i, model] of req.models.entries()) {
    let res: Response;
    try {
      res = await attempt(model, req, stream);
    } catch (err) {
      if (req.signal?.aborted) throw err;
      failures.push({ model, error: err instanceof Error ? err.message : String(err) });
      continue;
    }
    if (res.ok && res.body) return { res, model, attempts: i + 1 };

    const text = await res.text().catch(() => "");
    failures.push({ model, status: res.status, error: text.slice(0, 500) });
    if (!FALLBACK_STATUSES.has(res.status)) break;
  }

  const last = failures.at(-1);
  const status = last?.status && last.status < 500 && last.status !== 404 ? last.status : 502;
  throw new HttpError(status, "All upstream models failed", { attempts: failures });
}

export async function complete(req: UpstreamRequest): Promise<CompletionResult> {
  const { res, model, attempts } = await withFallback(req, false);
  const json = (await res.json()) as {
    model?: string;
    choices?: { message?: { content?: string | null } }[];
    usage?: Usage;
  };
  return {
    content: json.choices?.[0]?.message?.content ?? "",
    usage: {
      prompt_tokens: json.usage?.prompt_tokens ?? 0,
      completion_tokens: json.usage?.completion_tokens ?? 0,
    },
    servedModel: json.model ?? model,
    attempts,
  };
}

/** Fallback applies until the first byte; once a stream starts it is committed to that model. */
export async function stream(req: UpstreamRequest): Promise<StreamResult> {
  const { res, model, attempts } = await withFallback(req, true);
  return { servedModel: model, attempts, chunks: parseSSE(res.body!) };
}

// Typed as BufferSource to match TextDecoderStream's writable side under the current DOM lib types.
async function* parseSSE(body: ReadableStream<BufferSource>): AsyncGenerator<ChatChunk> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        // Ignore comments (OpenRouter sends ": OPENROUTER PROCESSING" keep-alives) and blank lines.
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          yield JSON.parse(data) as ChatChunk;
        } catch {
          // Skip malformed frames rather than killing the stream.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
