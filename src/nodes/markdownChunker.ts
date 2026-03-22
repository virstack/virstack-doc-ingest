import { MAX_CHUNK_TOKENS } from "../config.js";
import type { PipelineState } from "../state.js";

/**
 * Rough token estimator: ~4 characters per token (English text heuristic).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Splits markdown text into semantic chunks:
 *  1. Primary split: by ## headings
 *  2. Secondary split: if a section exceeds MAX_CHUNK_TOKENS, split by paragraphs
 *  3. Tertiary split: if a paragraph still exceeds, split by sentence boundaries
 */
export async function markdownChunker(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const { markdown } = state;

  console.log(`[markdownChunker] Input: ${markdown.length} chars`);

  // Split by ## headings, keeping the heading with its section
  const sections = splitBySections(markdown);
  const textChunks: string[] = [];

  for (const section of sections) {
    if (estimateTokens(section) <= MAX_CHUNK_TOKENS) {
      textChunks.push(section.trim());
    } else {
      // Split oversized section into smaller chunks
      const subChunks = splitOversizedSection(section, MAX_CHUNK_TOKENS);
      textChunks.push(...subChunks);
    }
  }

  // Filter out empty chunks
  const filtered = textChunks.filter((c) => c.trim().length > 0);

  console.log(`[markdownChunker] Created ${filtered.length} chunks`);

  return { textChunks: filtered };
}

/**
 * Splits markdown into sections at ## boundaries.
 */
function splitBySections(markdown: string): string[] {
  const lines = markdown.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") && current.length > 0) {
      sections.push(current.join("\n"));
      current = [];
    }
    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current.join("\n"));
  }

  return sections;
}

/**
 * Splits an oversized section into chunks that fit within the token limit.
 */
function splitOversizedSection(
  section: string,
  maxTokens: number,
): string[] {
  const paragraphs = section.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;

    if (estimateTokens(candidate) <= maxTokens) {
      current = candidate;
    } else {
      if (current) {
        chunks.push(current.trim());
      }

      // If single paragraph exceeds limit, split by sentences
      if (estimateTokens(para) > maxTokens) {
        const sentenceChunks = splitBySentences(para, maxTokens);
        chunks.push(...sentenceChunks);
        current = "";
      } else {
        current = para;
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Last-resort split by sentence boundaries.
 */
function splitBySentences(text: string, maxTokens: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current + sentence;
    if (estimateTokens(candidate) <= maxTokens) {
      current = candidate;
    } else {
      if (current) chunks.push(current.trim());
      current = sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
