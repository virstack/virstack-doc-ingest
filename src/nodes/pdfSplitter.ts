import fs from "node:fs/promises";
import path from "node:path";
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
  if (!state.filePath) throw new Error("[pdfSplitter] filePath is missing");
  const fullPath = path.resolve(process.cwd(), state.filePath);
  console.log(`[pdfSplitter] Reading file at: ${fullPath}`);

  let fileBuffer;
  try {
    fileBuffer = await fs.readFile(fullPath);
  } catch (err: any) {
    throw new Error(`Failed to read file at ${fullPath}: ${err.message}`);
  }
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const totalPages = pdfDoc.getPageCount();

  console.log(`[pdfSplitter] Total pages: ${totalPages}`);
  console.log(
    `[pdfSplitter] Splitting into chunks of ${PDF_PAGES_PER_CHUNK} pages`,
  );

  const chunks: string[] = [];

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
    chunks.push(Buffer.from(subBytes).toString("base64"));
  }

  console.log(`[pdfSplitter] Created ${chunks.length} PDF chunk(s)`);

  return { pdfChunks: chunks };
}
