import type { PipelineState } from "../state.js";

/**
 * Normalizes the merged/extracted markdown:
 *  - Strips residual HTML tags
 *  - Fixes broken Markdown table alignment
 *  - Deduplicates repeated headers/footers
 *  - Trims excessive whitespace
 */
export async function markdownNormalizer(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  let md = state.markdown;

  console.log(`[markdownNormalizer] Input: ${md.length} chars`);

  // 1. Strip HTML tags (but keep content)
  md = md.replace(/<\/?[^>]+(>|$)/g, "");

  // 2. Fix table alignment: ensure pipes are balanced
  md = md.replace(/^\|(.+)\|$/gm, (match) => {
    // Clean up cells — trim whitespace around pipes
    return match
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean)
      .map((cell) => ` ${cell} `)
      .join("|")
      .replace(/^/, "|")
      .replace(/$/, "|");
  });

  // 3. Deduplicate consecutive identical headings
  const lines = md.split("\n");
  const deduped: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = deduped[deduped.length - 1];
    if (
      line.startsWith("#") &&
      prev === line
    ) {
      continue; // skip duplicate heading
    }
    deduped.push(line);
  }
  md = deduped.join("\n");

  // 4. Collapse excessive blank lines
  md = md.replace(/\n{3,}/g, "\n\n");

  // 5. Trim
  md = md.trim();

  console.log(`[markdownNormalizer] Output: ${md.length} chars`);

  return { markdown: md };
}
