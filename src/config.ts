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
    throw new Error("RAG Pipeline not initialized. Call initializeConfig() first.");
  }
}
