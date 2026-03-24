export const LogSource = {
  BATCH: "Batch Pipeline",
  CLI: "CLI",
  FILE_ROUTER: "File Router",
  LLM_EXTRACTION: "LLM Extraction",
  LIBRE_OFFICE: "LibreOffice to PDF",
  MARKDOWN_CHUNKER: "Markdown Chunker",
  MARKDOWN_MERGER: "Markdown Merger",
  MARKDOWN_NORMALIZER: "Markdown Normalizer",
  VECTOR_EMBEDDER: "Vector Embedder",
  PDF_SPLITTER: "PDF Splitter",
  PIPELINE: "Pipeline",
  SAVE_MARKDOWN: "Save Markdown",
  TEXT_EXTRACTOR: "Text Extractor",
  VECTOR_UPSERT: "Vector Upsert",
} as const;

export type LogSourceType = (typeof LogSource)[keyof typeof LogSource];

// Define the contract for our logger
export interface CustomLogger {
  info: (source: LogSourceType, message: string) => void;
  warn: (source: LogSourceType, message: string) => void;
  error: (source: LogSourceType, message: string, error?: unknown) => void;
  success: (source: LogSourceType, message: string) => void;
}

// Default console implementation (used by default for Library consumers)
const defaultLogger: CustomLogger = {
  info: (source, message) => console.log(`[${source}] ${message}`),
  warn: (source, message) => console.warn(`[${source}] ⚠️ ${message}`),
  error: (source, message, error) => {
    if (error !== undefined) console.error(`[${source}] ❌ ${message}`, error);
    else console.error(`[${source}] ❌ ${message}`);
  },
  success: (source, message) => console.log(`[${source}] ✅ ${message}`),
};

// Store the active logger
let activeLogger: CustomLogger = defaultLogger;

// Allow the CLI to inject its own logger (like @clack/prompts)
export function setLogger(loggerInstance: CustomLogger) {
  activeLogger = loggerInstance;
}

// The exported logger object that all your nodes will use
export const logger = {
  info: (s: LogSourceType, m: string) => activeLogger.info(s, m),
  warn: (s: LogSourceType, m: string) => activeLogger.warn(s, m),
  error: (s: LogSourceType, m: string, e?: unknown) => activeLogger.error(s, m, e),
  success: (s: LogSourceType, m: string) => activeLogger.success(s, m),
};
