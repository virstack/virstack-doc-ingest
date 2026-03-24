import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { PipelineState } from "../state.js";
import { logger, LogSource } from "../logger.js";

/**
 * Saves the final normalized markdown to a local file.
 * Creates a folder named after the document (with a unique hash) in the 'outputs' directory.
 */
export async function saveMarkdown(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const { filePath, markdown } = state;

  // Create a unique hash for the output folder
  const fileHash = crypto
    .createHash("md5")
    .update(state.filePath || "pasted_text")
    .digest("hex")
    .slice(0, 16);

  const baseName = state.filePath ? path.parse(state.filePath).name : "pasted_text";
  const outputDir = path.resolve(process.cwd(), "outputs", `${baseName}_${fileHash}`);
  const outputPath = path.join(outputDir, "full_content.md");

  logger.info(LogSource.SAVE_MARKDOWN, `Saving to: ${outputPath}`);

  // Create directory (and parents)
  await fs.mkdir(outputDir, { recursive: true });

  // Write markdown
  await fs.writeFile(outputPath, markdown, "utf-8");

  logger.success(LogSource.SAVE_MARKDOWN, `Markdown saved successfully`);

  return {};
}
