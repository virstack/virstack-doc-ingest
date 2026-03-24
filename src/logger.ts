export const LogSource = {
  BATCH: "Batch Pipeline",
  CLI: "CLI",
  FILE_ROUTER: "File Router",
  GEMINI: "Gemini Extraction",
  LIBRE_OFFICE: "LibreOffice to PDF",
  MARKDOWN_CHUNKER: "Markdown Chunker",
  MARKDOWN_MERGER: "Markdown Merger",
  MARKDOWN_NORMALIZER: "Markdown Normalizer",
  OPENROUTER_EMBEDDER: "OpenRouter Embedder",
  PDF_SPLITTER: "PDF Splitter",
  PIPELINE: "Pipeline",
  SAVE_MARKDOWN: "Save Markdown",
  TEXT_EXTRACTOR: "Text Extractor",
  VECTOR_UPSERT: "Vector Upsert",
} as const;

export type LogSourceType = (typeof LogSource)[keyof typeof LogSource];

export const logger = {
  info: (source: LogSourceType, message: string) => {
    console.log(`[${source}] ${message}`);
  },
  warn: (source: LogSourceType, message: string) => {
    console.warn(`[${source}] ⚠️ ${message}`);
  },
  error: (source: LogSourceType, message: string, error?: unknown) => {
    if (error !== undefined) {
      console.error(`[${source}] ❌ ${message}`, error);
    } else {
      console.error(`[${source}] ❌ ${message}`);
    }
  },
  success: (source: LogSourceType, message: string) => {
    console.log(`[${source}] ✅ ${message}`);
  },
};
