import { OpenAI } from "openai";
import { Index } from "@upstash/vector";
import pLimit from "p-limit";

// 1. Define what the user can configure
export interface RagPipelineConfig {
  openRouterApiKey: string;
  upstashUrl: string;
  upstashToken: string;
  llmModel: string;
  embeddingModel: string;
  chunkSize?: number;
  chunkOverlap?: number;
  pdfPagesPerChunk?: number;
  maxConcurrentFiles?: number;
  maxConcurrentApi?: number;
  systemPrompt?: string;
  maxTokens?: number;
}

// 2. Hold the global clients and settings
export let openrouter: OpenAI;
export let vectorIndex: Index;
export let pipelineConfig: Required<RagPipelineConfig>;

// Global API rate limiter initialized lazily
export let apiLimit: ReturnType<typeof pLimit>;

// 3. Create the initialization function
export function initializeConfig(config: RagPipelineConfig) {
  // Apply defaults for optional numeric fields
  pipelineConfig = {
    openRouterApiKey: config.openRouterApiKey,
    upstashUrl: config.upstashUrl,
    upstashToken: config.upstashToken,
    llmModel: config.llmModel,
    embeddingModel: config.embeddingModel,
    chunkSize: config.chunkSize || 1000,
    chunkOverlap: config.chunkOverlap || 100,
    pdfPagesPerChunk: config.pdfPagesPerChunk || 10,
    maxConcurrentFiles: config.maxConcurrentFiles || 3,
    maxConcurrentApi: config.maxConcurrentApi || 15,
    systemPrompt: config.systemPrompt,
    maxTokens: config.maxTokens || 16384,
  } as Required<RagPipelineConfig>;

  // Initialize clients with the provided keys
  openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: pipelineConfig.openRouterApiKey,
    maxRetries: 5,
  });

  vectorIndex = new Index({
    url: pipelineConfig.upstashUrl,
    token: pipelineConfig.upstashToken,
  });

  apiLimit = pLimit(pipelineConfig.maxConcurrentApi);
}

// Helper to ensure config is loaded before a node runs
export function requireInit() {
  if (!openrouter || !vectorIndex || !pipelineConfig) {
    throw new Error(
      "RAG Pipeline not initialized. Call initializeConfig() first.",
    );
  }
}

/**
 * Helper for CLI/Tools to get a RagPipelineConfig object from process.env
 */
export function getEnvConfig(): RagPipelineConfig {
  return {
    openRouterApiKey: process.env.OPENROUTER_API_KEY as string,
    upstashUrl: process.env.UPSTASH_VECTOR_URL as string,
    upstashToken: process.env.UPSTASH_VECTOR_TOKEN as string,
    llmModel: process.env.LLM_MODEL as string,
    embeddingModel: process.env.EMBEDDING_MODEL as string,
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
