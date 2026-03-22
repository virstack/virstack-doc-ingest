import fs from "node:fs/promises";
import officeparser from "officeparser";
import { parse } from "csv-parse/sync";
import type { PipelineState } from "../state.js";

/**
 * Extracts raw text from office documents (DOCX, PPTX, XLSX) using officeparser,
 * CSV files using csv-parse, and TXT files via direct read.
 */
export async function officeparserNode(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const { filePath, mimeType } = state;

  console.log(`[officeparserNode] Parsing: ${filePath} (${mimeType})`);

  let rawText: string;

  if (mimeType === "text/plain") {
    // Plain text — just read directly
    rawText = await fs.readFile(filePath, "utf-8");
  } else if (mimeType === "text/csv") {
    // CSV — parse and convert to a readable text table
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
    rawText = await officeparser.parseOfficeAsync(filePath) as string;
  }

  console.log(
    `[officeparserNode] Extracted ${rawText.length} chars of raw text`,
  );

  return { rawText };
}
