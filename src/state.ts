import { Annotation } from "@langchain/langgraph";

/**
 * LangGraph pipeline state definition.
 * Every node reads from and writes to this shared state.
 */
export const PipelineStateAnnotation = Annotation.Root({
  /** Absolute path to the input file */
  filePath: Annotation<string>,

  /** Detected MIME type of the input file */
  mimeType: Annotation<string>,

  /** Extracted raw text (office / text branch) */
  rawText: Annotation<string>,

  /** 10-page PDF chunk buffers (PDF branch) */
  pdfChunks: Annotation<Buffer[]>,

  /** Per-chunk markdown outputs from Gemini (PDF branch) */
  markdownParts: Annotation<string[]>,

  /** Final merged / extracted markdown (both branches converge here) */
  markdown: Annotation<string>,

  /** Semantic text chunks after splitting */
  textChunks: Annotation<string[]>,

  /** OpenAI embedding vectors, one per text chunk */
  vectors: Annotation<number[][]>,
});

export type PipelineState = typeof PipelineStateAnnotation.State;
