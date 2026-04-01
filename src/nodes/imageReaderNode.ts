import fs from "node:fs/promises";
import path from "node:path";
import type { PipelineState } from "../core/state.js";
import { logger, LogSource } from "../core/logger.js";
import { requireInit } from "../core/config.js";

/**
 * Reads an image file and converts it into a base64 chunk.
 * The resulting chunk is stored in `state.pdfChunks` so it can be 
 * processed generically by the same parallel LLM dispatch logic.
 */
export async function imageReaderNode(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  requireInit();
  
  if (!state.filePath) throw new Error("[imageReaderNode] filePath is missing");
  const fullPath = path.resolve(process.cwd(), state.filePath);
  logger.info(LogSource.PDF_SPLITTER, `Reading image at: ${fullPath}`); // Reusing PDF_SPLITTER or maybe we can just use generic logging but LogSource is an enum.

  let fileBuffer;
  try {
    fileBuffer = await fs.readFile(fullPath);
  } catch (err: any) {
    throw new Error(`Failed to read image at ${fullPath}: ${err.message}`);
  }

  const base64Data = fileBuffer.toString("base64");
  
  // We place it in pdfChunks so it uses the exact same parallel mapping logic
  logger.info(LogSource.PDF_SPLITTER, `Created 1 image chunk from ${state.mimeType}`);
  
  return { pdfChunks: [base64Data] };
}
