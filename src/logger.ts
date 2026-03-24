export const LogSource = {
  BATCH: "batchPipeline",
  CLI: "cli",
  FILE_ROUTER: "fileTypeRouter",
  GEMINI: "geminiExtraction",
  LIBRE_OFFICE: "libreOfficeToPdf",
  MARKDOWN_CHUNKER: "markdownChunker",
  MARKDOWN_MERGER: "markdownMerger",
  MARKDOWN_NORMALIZER: "markdownNormalizer",
  OPENROUTER_EMBEDDER: "openrouterEmbedder",
  PDF_SPLITTER: "pdfSplitter",
  PIPELINE: "pipeline",
  SAVE_MARKDOWN: "saveMarkdown",
  TEXT_EXTRACTOR: "textExtractorNode",
  UPSTASH_UPSERT: "upstashUpsert",
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
