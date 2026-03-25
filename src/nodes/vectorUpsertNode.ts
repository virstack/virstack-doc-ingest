import path from "node:path";
import crypto from "node:crypto";
import { pipelineConfig, requireInit } from "../core/config.js";
import type { PipelineState } from "../core/state.js";
import { logger, LogSource } from "../core/logger.js";
import type { VectorRecord } from "../adapters/vectorStore.js";

/**
 * Upserts text chunks + their embedding vectors into a generic Vector Store Adapter.
 * Each chunk is stored with rich metadata for vector filtering.
 */
export async function vectorUpsertNode(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  requireInit();
  const { filePath, mimeType, textChunks, vectors } = state;

  // Generate a stable document ID from the file path
  const docId = crypto
    .createHash("sha256")
    .update(filePath || "pasted_text")
    .digest("hex")
    .slice(0, 8);

  logger.info(LogSource.VECTOR_UPSERT, `Upserting ${textChunks.length} chunks via Vector Store Adapter for doc ${docId}`);

  // Format the data into our standard contract
  const records: VectorRecord[] = textChunks.map((chunk, i) => ({
    id: `${docId}-chunk-${i}`,
    vector: vectors[i] as number[],
    metadata: {
      text: chunk,
      source: state.filePath ? path.basename(state.filePath) : "pasted_text",
      sourcePath: filePath,
      mimeType: mimeType,
      chunkIndex: i,
      totalChunks: textChunks.length,
      docId: docId,
      ingestedAt: new Date().toISOString(),
    },
  }));

  // Upsert in batches of 100 (Common limit for many vector DBs)
  const BATCH_SIZE = 100;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    // Call the user's database adapter instead of Upstash directly!
    await pipelineConfig.vectorStore.upsert(batch);

    logger.info(LogSource.VECTOR_UPSERT, `Upserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} vectors)`);
  }

  logger.success(LogSource.VECTOR_UPSERT, `All ${textChunks.length} chunks upserted`);

  return {};
}
