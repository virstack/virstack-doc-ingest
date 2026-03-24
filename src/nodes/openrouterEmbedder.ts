import { openrouter, pipelineConfig, requireInit } from "../config.js";
import type { PipelineState } from "../state.js";
import { logger, LogSource } from "../logger.js";

/** Maximum chunks to embed in a single OpenAI API call */
const BATCH_SIZE = 50;

/**
 * Embeds all textChunks using OpenAI's text-embedding-3-large model.
 * Processes in batches of BATCH_SIZE to stay within API limits.
 */
export async function openrouterEmbedder(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  requireInit();
  const { textChunks } = state;

  logger.info(LogSource.OPENROUTER_EMBEDDER, `Embedding ${textChunks.length} chunks with ${pipelineConfig.embeddingModel}`);

  const allVectors: number[][] = [];

  for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
    const batch = textChunks.slice(i, i + BATCH_SIZE);

    logger.info(LogSource.OPENROUTER_EMBEDDER, `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} chunk(s)`);

    const response = await openrouter.embeddings.create({
      model: pipelineConfig.embeddingModel,
      input: batch,
      dimensions: 1536,
    } as any); // Cast to any as 'dimensions' might not be in the basic OpenAI type for all SDK versions

    // Sort by index to ensure correct ordering
    const sorted = response.data.sort((a: any, b: any) => a.index - b.index);
    for (const item of sorted) {
      allVectors.push(item.embedding);
    }
  }

  logger.info(LogSource.OPENROUTER_EMBEDDER, `Generated ${allVectors.length} vectors (${allVectors[0]?.length ?? 0}d)`);

  return { vectors: allVectors };
}
