import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { PipelineState } from "../state.js";

/**
 * Saves the final normalized markdown to a local file.
 * Creates a folder named after the document (with a unique hash) in the 'outputs' directory.
 */
export async function saveMarkdown(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const { filePath, markdown } = state;

  // Generate unique ID for this document
  const docId = crypto
    .createHash("sha256")
    .update(filePath)
    .digest("hex")
    .slice(0, 16);

  const baseName = path.parse(filePath).name;
  const outputDir = path.resolve(process.cwd(), "outputs", `${baseName}_${docId}`);
  const outputPath = path.join(outputDir, "full_content.md");

  console.log(`[saveMarkdown] Saving to: ${outputPath}`);

  // Create directory (and parents)
  await fs.mkdir(outputDir, { recursive: true });

  // Write markdown
  await fs.writeFile(outputPath, markdown, "utf-8");

  console.log(`[saveMarkdown] ✅ Markdown saved successfully`);

  return {};
}
