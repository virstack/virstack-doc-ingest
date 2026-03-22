import fs from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { PDF_PAGES_PER_CHUNK } from "../config.js";
import type { PipelineState } from "../state.js";

/**
 * Splits a PDF into sub-documents of PDF_PAGES_PER_CHUNK pages each.
 * Each sub-document is serialised back to a Buffer for downstream Gemini processing.
 */
export async function pdfSplitter(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const fileBuffer = await fs.readFile(state.filePath);
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const totalPages = pdfDoc.getPageCount();

  console.log(`[pdfSplitter] Total pages: ${totalPages}`);
  console.log(
    `[pdfSplitter] Splitting into chunks of ${PDF_PAGES_PER_CHUNK} pages`,
  );

  const chunks: Buffer[] = [];

  for (let start = 0; start < totalPages; start += PDF_PAGES_PER_CHUNK) {
    const end = Math.min(start + PDF_PAGES_PER_CHUNK, totalPages);
    const subDoc = await PDFDocument.create();

    const copiedPages = await subDoc.copyPages(
      pdfDoc,
      Array.from({ length: end - start }, (_, i) => start + i),
    );

    for (const page of copiedPages) {
      subDoc.addPage(page);
    }

    const subBytes = await subDoc.save();
    chunks.push(Buffer.from(subBytes));
  }

  console.log(`[pdfSplitter] Created ${chunks.length} PDF chunk(s)`);

  return { pdfChunks: chunks };
}
