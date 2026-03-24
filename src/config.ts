import pLimit from "p-limit";
import { UpstashAdapter, type VectorStoreAdapter } from "./vectorStore.js";
import { type LlmAdapter, type EmbeddingAdapter, OpenRouterLlmAdapter, OpenRouterEmbeddingAdapter } from "./aiAdapters.js";

// 1. Define what the user can configure
export interface RagPipelineConfig {
  openRouterApiKey?: string; // Kept for CLI backwards compatibility convenience, but technically optional now if using custom adapters
  vectorStore: VectorStoreAdapter;
  llm: LlmAdapter;
  embedder: EmbeddingAdapter;
  chunkSize?: number;
  chunkOverlap?: number;
  pdfPagesPerChunk?: number;
  embeddingDimensions?: number;
  maxConcurrentFiles?: number;
  maxConcurrentApi?: number;
  systemPrompt?: string;
  maxTokens?: number;
}

// 2. Hold the global settings
export let pipelineConfig: Required<RagPipelineConfig>;

// Global API rate limiter initialized lazily
export let apiLimit: ReturnType<typeof pLimit>;

// 3. Create the initialization function
export function initializeConfig(config: RagPipelineConfig) {
  // 1. Validate required parameters
  const missing: string[] = [];
  if (!config.vectorStore) missing.push("vectorStore");
  if (!config.llm) missing.push("llm");
  if (!config.embedder) missing.push("embedder");

  if (missing.length > 0) {
    throw new Error(
      `RAG Pipeline initialization failed. Missing required adapters: ${missing.join(", ")}`,
    );
  }

  // Apply defaults for optional numeric fields
  pipelineConfig = {
    openRouterApiKey: config.openRouterApiKey || "",
    vectorStore: config.vectorStore,
    llm: config.llm,
    embedder: config.embedder,
    chunkSize: config.chunkSize || 1000,
    chunkOverlap: config.chunkOverlap || 100,
    pdfPagesPerChunk: config.pdfPagesPerChunk || 10,
    embeddingDimensions: config.embeddingDimensions || 1536,
    maxConcurrentFiles: config.maxConcurrentFiles || 3,
    maxConcurrentApi: config.maxConcurrentApi || 15,
    systemPrompt: config.systemPrompt,
    maxTokens: config.maxTokens || 16384,
  } as Required<RagPipelineConfig>;

  // Global rate limiter initialized lazily
  apiLimit = pLimit(pipelineConfig.maxConcurrentApi);
}

// Helper to ensure config is loaded before a node runs
export function requireInit() {
  if (!pipelineConfig) {
    throw new Error(
      "RAG Pipeline not initialized. Call initializeConfig() first.",
    );
  }
}

/**
 * Helper for CLI/Tools to get a RagPipelineConfig object from process.env
 */
export function getEnvConfig(): RagPipelineConfig {
  const apiKey = process.env.OPENROUTER_API_KEY as string;
  const llmModel = process.env.LLM_MODEL as string;
  const embedModel = process.env.EMBEDDING_MODEL as string;
  const url = process.env.UPSTASH_VECTOR_URL;
  const token = process.env.UPSTASH_VECTOR_TOKEN;
  const dimensions = process.env.EMBEDDING_DIMENSIONS
    ? parseInt(process.env.EMBEDDING_DIMENSIONS, 10)
    : 1536;

  // Validate required ENVs for CLI/Defaults
  const missing: string[] = [];
  if (!apiKey) missing.push("OPENROUTER_API_KEY");
  if (!llmModel) missing.push("LLM_MODEL");
  if (!embedModel) missing.push("EMBEDDING_MODEL");
  if (!url) missing.push("UPSTASH_VECTOR_URL");
  if (!token) missing.push("UPSTASH_VECTOR_TOKEN");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const vectorStore = new UpstashAdapter(url!, token!);

  return {
    openRouterApiKey: apiKey,
    vectorStore: vectorStore as VectorStoreAdapter,
    llm: new OpenRouterLlmAdapter(apiKey, llmModel),
    embedder: new OpenRouterEmbeddingAdapter(apiKey, embedModel, dimensions),
    embeddingDimensions: dimensions,
    chunkSize: process.env.CHUNK_SIZE
      ? parseInt(process.env.CHUNK_SIZE, 10)
      : undefined,
    chunkOverlap: process.env.CHUNK_OVERLAP
      ? parseInt(process.env.CHUNK_OVERLAP, 10)
      : undefined,
    maxConcurrentFiles: process.env.MAX_CONCURRENT_FILES
      ? parseInt(process.env.MAX_CONCURRENT_FILES, 10)
      : undefined,
    maxConcurrentApi: process.env.MAX_CONCURRENT_API_CALLS
      ? parseInt(process.env.MAX_CONCURRENT_API_CALLS, 10)
      : undefined,
    systemPrompt: process.env.SYSTEM_PROMPT,
    maxTokens: process.env.MAX_TOKENS
      ? parseInt(process.env.MAX_TOKENS, 10)
      : undefined,
  };
}
