// Export the config API
export { initializeConfig, type OmniIngestConfig } from "./core/config.js";

// Export the processing graphs
export { graph as batchGraph, BatchStateAnnotation } from "./graphs/batchProcessor.js";
export { buildPipeline, graph as singleDocGraph } from "./graphs/singleDocument.js";

// Export the state types for TypeScript consumers
export type { PipelineState } from "./core/state.js";
export type { BatchState } from "./graphs/batchProcessor.js";

// Export vector store injection types and built-in adapters
export { type VectorStoreAdapter, type VectorRecord, UpstashAdapter } from "./adapters/vectorStore.js";

// Export AI injection types and built-in adapters
export {
  type LlmAdapter,
  type LlmInput,
  type EmbeddingAdapter,
  OpenRouterLlmAdapter,
  OpenRouterEmbeddingAdapter
} from "./adapters/aiAdapters.js";
