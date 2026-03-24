import "dotenv/config";
import { OpenAI } from "openai";
import { Index, type IndexConfig } from "@upstash/vector";

/* ------------------------------------------------------------------ */
/*  Environment validation                                            */
/* ------------------------------------------------------------------ */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

/** LLM model identifier on OpenRouter */
export const LLM_MODEL = requireEnv("LLM_MODEL");

/** Embedding model used via OpenRouter */
export const EMBEDDING_MODEL = requireEnv("EMBEDDING_MODEL");

/** Document chunk size (characters) */
export const CHUNK_SIZE = 1000;

/** Document chunk overlap (characters) */
export const CHUNK_OVERLAP = 100;

/** Number of pages per PDF sub-chunk for Gemini processing */
export const PDF_PAGES_PER_CHUNK = 10;

/** Max documents to process concurrently in batch mode */
export const CONCURRENCY_LIMIT = parseInt(process.env.CONCURRENCY_LIMIT || "5", 10);

/* ------------------------------------------------------------------ */
/*  Clients                                                           */
/* ------------------------------------------------------------------ */

/** OpenRouter client (used for both chat completions and embeddings) */
export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: requireEnv("OPENROUTER_API_KEY"),
  maxRetries: 5,
});

/** Upstash Vector index (1536-d for text-embedding-3-small) */
export const vectorIndex: Index = new Index({
  url: requireEnv("UPSTASH_VECTOR_URL"),
  token: requireEnv("UPSTASH_VECTOR_TOKEN"),
});
