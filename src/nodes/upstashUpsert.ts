import path from "node:path";
import crypto from "node:crypto";
import { vectorIndex } from "../config.js";
import type { PipelineState } from "../state.js";

/**
 * Upserts text chunks + their embedding vectors into Upstash Vector.
 * Each chunk is stored with rich metadata for RAG filtering.
 */
export async function upstashUpsert(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const { filePath, mimeType, textChunks, vectors } = state;

  // Generate a stable document ID from the file path
  const docId = crypto
    .createHash("sha256")
    .update(filePath)
    .digest("hex")
    .slice(0, 16);

  console.log(
    `[upstashUpsert] Upserting ${textChunks.length} chunks for doc ${docId}`,
  );

  // Upstash Vector supports batch upserts
  const upsertPayload = textChunks.map((chunk, i) => ({
    id: `${docId}-chunk-${i}`,
    vector: vectors[i],
    data: chunk,
    metadata: {
      source: path.basename(filePath),
      sourcePath: filePath,
      mimeType: mimeType,
      chunkIndex: i,
      totalChunks: textChunks.length,
      docId: docId,
      ingestedAt: new Date().toISOString(),
    },
  }));

  // Upsert in batches of 100 (Upstash limit)
  const BATCH_SIZE = 100;
  for (let i = 0; i < upsertPayload.length; i += BATCH_SIZE) {
    const batch = upsertPayload.slice(i, i + BATCH_SIZE);
    await vectorIndex.upsert(batch);

    console.log(
      `[upstashUpsert] Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} vectors`,
    );
  }

  console.log(`[upstashUpsert] ✅ All ${textChunks.length} chunks upserted`);

  return {};
}
