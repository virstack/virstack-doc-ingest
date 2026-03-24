import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { pipelineConfig, requireInit } from "../config.js";
import type { PipelineState } from "../state.js";
import { logger, LogSource } from "../logger.js";

/**
 * Splits a PDF into sub-documents of PDF_PAGES_PER_CHUNK pages each.
 * Each sub-document is serialised back to a Buffer for downstream Gemini processing.
 */
export async function pdfSplitter(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  requireInit();
  if (!state.filePath) throw new Error("[pdfSplitter] filePath is missing");
  const fullPath = path.resolve(process.cwd(), state.filePath);
  logger.info(LogSource.PDF_SPLITTER, `Reading file at: ${fullPath}`);

  let fileBuffer;
  try {
    fileBuffer = await fs.readFile(fullPath);
  } catch (err: any) {
    throw new Error(`Failed to read file at ${fullPath}: ${err.message}`);
  }
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const totalPages = pdfDoc.getPageCount();

  logger.info(LogSource.PDF_SPLITTER, `Total pages: ${totalPages}`);
  logger.info(LogSource.PDF_SPLITTER, `Splitting into chunks of ${pipelineConfig.pdfPagesPerChunk} pages`);

  const chunks: string[] = [];

  for (let start = 0; start < totalPages; start += pipelineConfig.pdfPagesPerChunk) {
    const end = Math.min(start + pipelineConfig.pdfPagesPerChunk, totalPages);
    const subDoc = await PDFDocument.create();

    const copiedPages = await subDoc.copyPages(
      pdfDoc,
      Array.from({ length: end - start }, (_, i) => start + i),
    );

    for (const page of copiedPages) {
      subDoc.addPage(page);
    }

    const subBytes = await subDoc.save();
    chunks.push(Buffer.from(subBytes).toString("base64"));
  }

  logger.info(LogSource.PDF_SPLITTER, `Created ${chunks.length} PDF chunk(s)`);

  return { pdfChunks: chunks };
}
