import type { PipelineState } from "../state.js";
import { logger, LogSource } from "../logger.js";

/**
 * Joins markdownParts from the PDF branch into a single markdown string.
 * Performs basic boundary-seam fixes:
 *  - Removes duplicate headings at chunk boundaries
 *  - Trims excessive whitespace between chunks
 */
export async function markdownMerger(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const { markdownParts } = state;

  logger.info(LogSource.MARKDOWN_MERGER, `Merging ${markdownParts.length} markdown part(s)`);

  let merged = "";

  for (let i = 0; i < markdownParts.length; i++) {
    let part = markdownParts[i].trim();

    if (i > 0) {
      // Check if the previous chunk ended with a heading that this chunk starts with
      const prevLines = merged.trimEnd().split("\n");
      const lastPrevLine = prevLines[prevLines.length - 1]?.trim() ?? "";
      const firstLine = part.split("\n")[0]?.trim() ?? "";

      if (
        lastPrevLine === firstLine &&
        firstLine.startsWith("#")
      ) {
        // Duplicate heading at boundary — skip it in current chunk
        part = part.split("\n").slice(1).join("\n").trim();
      }

      merged += "\n\n";
    }

    merged += part;
  }

  // Collapse triple+ newlines into double
  merged = merged.replace(/\n{3,}/g, "\n\n");

  logger.info(LogSource.MARKDOWN_MERGER, `Merged markdown: ${merged.length} chars`);

  return { markdown: merged };
}
