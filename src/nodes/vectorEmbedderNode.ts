import { pipelineConfig, requireInit } from "../config.js";
import type { PipelineState } from "../state.js";
import { logger, LogSource } from "../logger.js";

/**
 * Embeds all textChunks using the injected EmbeddingAdapter.
 * Processes in batches to stay within API limits.
 */
export async function vectorEmbedderNode(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  requireInit();
  const { textChunks } = state;

  logger.info(LogSource.VECTOR_EMBEDDER, `Embedding ${textChunks.length} chunks via injected Embedder Node`);

  const allVectors: number[][] = [];
  const BATCH_SIZE = 50; // Common safe default, though adapters might handle their own batching internally

  for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
    const batch = textChunks.slice(i, i + BATCH_SIZE);

    logger.info(LogSource.VECTOR_EMBEDDER, `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} chunk(s)`);

    // Call the injected Embedding adapter!
    const vectors = await pipelineConfig.embedder.embed(batch);
    allVectors.push(...vectors);
  }

  logger.info(LogSource.VECTOR_EMBEDDER, `Generated ${allVectors.length} vectors (${allVectors[0]?.length ?? 0}d)`);

  return { vectors: allVectors };
}
