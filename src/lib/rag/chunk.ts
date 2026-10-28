export type ChunkStrategy = "fixed" | "recursive" | "markdown_headers" | "semantic";

export interface Chunk {
  index: number;
  content: string;
  heading?: string;
}

/**
 * Splits text according to the strategy the architect chose. "semantic" is
 * approximated with paragraph-aware recursive splitting; swap in an
 * embedding-similarity splitter if boundary quality matters for your corpus.
 */
export function chunkText(
  text: string,
  strategy: ChunkStrategy,
  size: number,
  overlap: number,
): Chunk[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  let pieces: { content: string; heading?: string }[];
  switch (strategy) {
    case "fixed":
      pieces = fixed(clean, size, overlap).map((content) => ({ content }));
      break;
    case "markdown_headers":
      pieces = byHeaders(clean).flatMap((section) =>
        recursive(section.body, size, overlap).map((content) => ({
          content: section.heading ? `${section.heading}\n\n${content}` : content,
          heading: section.heading,
        })),
      );
      break;
    default:
      pieces = recursive(clean, size, overlap).map((content) => ({ content }));
  }

  return pieces
    .filter((p) => p.content.trim().length > 0)
    .map((p, index) => ({ index, ...p }));
}

function fixed(text: string, size: number, overlap: number): string[] {
  const step = Math.max(1, size - overlap);
  const out: string[] = [];
  for (let i = 0; i < text.length; i += step) {
    out.push(text.slice(i, i + size));
    if (i + size >= text.length) break;
  }
  return out;
}

const SEPARATORS = ["\n\n", "\n", ". ", " "];

function recursive(text: string, size: number, overlap: number, depth = 0): string[] {
  if (text.length <= size) return [text];
  const sep = SEPARATORS[depth];
  if (sep === undefined) return fixed(text, size, overlap);

  const parts = text.split(sep);
  const out: string[] = [];
  let current = "";
  for (const part of parts) {
    const candidate = current ? current + sep + part : part;
    if (candidate.length <= size) {
      current = candidate;
      continue;
    }
    if (current) out.push(current);
    if (part.length > size) {
      out.push(...recursive(part, size, overlap, depth + 1));
      current = "";
    } else {
      // Carry the tail of the previous chunk forward as overlap.
      const tail = overlap > 0 && current ? current.slice(-overlap) : "";
      current = tail ? tail + sep + part : part;
    }
  }
  if (current) out.push(current);
  return out;
}

function byHeaders(text: string): { heading?: string; body: string }[] {
  const lines = text.split("\n");
  const sections: { heading?: string; body: string }[] = [];
  let heading: string | undefined;
  let body: string[] = [];
  const flush = () => {
    if (body.join("").trim()) sections.push({ heading, body: body.join("\n").trim() });
  };
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      flush();
      heading = line.trim();
      body = [];
    } else {
      body.push(line);
    }
  }
  flush();
  return sections;
}
