import fs from "node:fs/promises";
import officeparser from "officeparser";
import { parse } from "csv-parse/sync";
import type { PipelineState } from "../core/state.js";
import { logger, LogSource } from "../core/logger.js";

/**
 * Extracts raw text from office documents (DOCX, PPTX, XLSX) using officeparser,
 * CSV files using csv-parse, and TXT files via direct read.
 */
export async function textExtractorNode(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const { filePath, mimeType } = state;

  logger.info(LogSource.TEXT_EXTRACTOR, `Parsing: ${filePath} (${mimeType})`);

  let rawText: string;

  if (mimeType === "text/plain") {
    // Plain text — just read directly
    rawText = filePath ? await fs.readFile(filePath, "utf-8") : state.rawText;
  } else if (mimeType === "text/csv") {
    // CSV — parse and convert to a readable text table
    if (!filePath) throw new Error("filePath required for CSV parsing");
    const csvBuffer = await fs.readFile(filePath, "utf-8");
    const records: string[][] = parse(csvBuffer, {
      skip_empty_lines: true,
    });

    // Convert to a simple text representation
    rawText = records
      .map((row) => row.join(" | "))
      .join("\n");
  } else {
    // DOCX, PPTX, XLSX — use officeparser
    if (!filePath) throw new Error("filePath required for office document parsing");
    rawText = await officeparser.parseOfficeAsync(filePath) as string;
  }

  logger.info(LogSource.TEXT_EXTRACTOR, `Extracted ${rawText.length} chars of raw text`);

  return { rawText };
}
