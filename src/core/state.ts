import { Annotation } from "@langchain/langgraph";
import type { UsageData } from "../adapters/aiAdapters.js";

/**
 * LangGraph pipeline state definition.
 * Every node reads from and writes to this shared state.
 */
export const PipelineStateAnnotation = Annotation.Root({
  /** Absolute path to the input file (optional if rawText is provided) */
  filePath: Annotation<string | undefined>,

  /** Detected MIME type of the input file (optional if rawText is provided) */
  mimeType: Annotation<string | undefined>,

  /** Extracted raw text (office / text branch) */
  rawText: Annotation<string>,

  /** 10-page PDF chunk buffers (base64 strings, PDF branch) */
  pdfChunks: Annotation<string[]>,

  /** Per-chunk markdown outputs from Gemini (PDF branch) */
  markdownParts: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  /** Final merged / extracted markdown (both branches converge here) */
  markdown: Annotation<string>,

  /** Semantic text chunks after splitting */
  textChunks: Annotation<string[]>,

  /** Embedding vectors, one per text chunk */
  vectors: Annotation<number[][]>,

  /** Accumulated usage data (tokens + cost) across all nodes */
  usage: Annotation<UsageData>({
    reducer: (x, y) => ({
      input_tokens: (x?.input_tokens || 0) + (y?.input_tokens || 0),
      output_tokens: (x?.output_tokens || 0) + (y?.output_tokens || 0),
      total_tokens: (x?.total_tokens || 0) + (y?.total_tokens || 0),
      cost: (x?.cost || 0) + (y?.cost || 0),
    }),
    default: () => ({ input_tokens: 0, output_tokens: 0, total_tokens: 0, cost: 0 })
  })
});

export type PipelineState = typeof PipelineStateAnnotation.State;
