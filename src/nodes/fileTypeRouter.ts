import path from "node:path";
import mime from "mime-types";
import type { PipelineState } from "../state.js";

/**
 * Detects the MIME type of the input file and writes it to state.
 * The routing decision itself is handled by the conditional edge in the graph.
 */
export async function fileTypeRouter(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const ext = path.extname(state.filePath).toLowerCase();
  const detected = mime.lookup(ext) || "application/octet-stream";

  console.log(`[fileTypeRouter] File: ${path.basename(state.filePath)}`);
  console.log(`[fileTypeRouter] Detected MIME: ${detected}`);

  return { mimeType: detected };
}

/**
 * Routing function used as the conditional edge after fileTypeRouter.
 * Returns a string key that maps to the next node.
 */
export function routeByMimeType(state: PipelineState): string {
  const mime = state.mimeType;

  if (mime === "application/pdf") {
    return "pdf";
  }

  if (mime === "text/plain") {
    return "text";
  }

  // DOCX, PPTX, XLSX, CSV, and other office formats
  const officeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.ms-powerpoint",
    "application/vnd.ms-excel",
    "text/csv",
  ];

  if (officeTypes.includes(mime)) {
    return "office";
  }

  // Fallback: try to treat as text
  console.warn(
    `[fileTypeRouter] Unknown MIME "${mime}", falling back to text branch`,
  );
  return "text";
}
