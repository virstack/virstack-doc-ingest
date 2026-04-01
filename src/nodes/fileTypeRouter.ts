import path from "node:path";
import mime from "mime-types";
import type { PipelineState } from "../core/state.js";
import { logger, LogSource } from "../core/logger.js";

/**
 * Detects the MIME type of the input file and writes it to state.
 * The routing decision itself is handled by the conditional edge in the graph.
 */
export async function fileTypeRouter(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  if (state.rawText && !state.filePath) {
    logger.info(LogSource.FILE_ROUTER, "Direct text input detected (no file)");
    return { mimeType: "text/plain" };
  }

  if (!state.filePath) {
    throw new Error("[fileTypeRouter] Either filePath or rawText must be provided.");
  }

  const ext = path.extname(state.filePath).toLowerCase();
  const detected = mime.lookup(ext) || "application/octet-stream";

  logger.info(LogSource.FILE_ROUTER, `File: ${path.basename(state.filePath)}`);
  logger.info(LogSource.FILE_ROUTER, `Detected MIME: ${detected}`);

  return { mimeType: detected };
}

/**
 * Routing function used as the conditional edge after fileTypeRouter.
 * Returns a string key that maps to the next node.
 *
 *  "pdf"     → direct PDF processing
 *  "convert" → LibreOffice → PDF → parallel extraction
 *  "extract" → textExtractorNode (XLSX, CSV, XLS, TXT, HTML)
 */
export function routeByMimeType(state: PipelineState): string {
  // If text is already extracted, go straight to Gemini
  if (state.rawText && !state.filePath) {
    return "extract";
  }

  const mime = state.mimeType;

  if (mime === "application/pdf") {
    return "pdf";
  }

  // Formats that LibreOffice should convert to PDF first
  const libreOfficeTypes = [
    // Word processing
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
    "application/msword",                                                        // DOC
    "application/rtf",                                                           // RTF
    "text/rtf",                                                                  // RTF alternate
    "application/vnd.oasis.opendocument.text",                                  // ODT
    "application/epub+zip",                                                      // EPUB
    // Presentations
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
    "application/vnd.ms-powerpoint",                                             // PPT
    "application/vnd.oasis.opendocument.presentation",                          // ODP
  ];

  if (mime && libreOfficeTypes.includes(mime)) {
    return "convert";
  }

  // Spreadsheets and CSV — officeparser handles these well
  const officeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
    "application/vnd.ms-excel",                                           // XLS
    "text/csv",
  ];

  if (mime && officeTypes.includes(mime)) {
    return "extract";
  }

  if (mime === "text/plain" || mime === "text/html") {
    return "extract";
  }

  // Images
  const imageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml"
  ];

  if (mime && imageTypes.includes(mime)) {
    return "image";
  }

  // Fallback: try to treat as text
  logger.warn(LogSource.FILE_ROUTER, `Unknown MIME "${mime}", falling back to extract branch`);
  return "extract";
}
