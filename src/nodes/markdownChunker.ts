import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { pipelineConfig, requireInit } from "../config.js";
import type { PipelineState } from "../state.js";

/**
 * Splits markdown text into semantic chunks using LangChain's RecursiveCharacterTextSplitter.
 * This splitter tries to split on paragraphs, then sentences, then words to keep 
 * related content together while respecting the chunk size.
 */
export async function markdownChunker(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  requireInit();
  const { markdown } = state;

  console.log(`[markdownChunker] Input: ${markdown.length} chars`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: pipelineConfig.chunkSize,
    chunkOverlap: pipelineConfig.chunkOverlap,
    // Optimal separators for Markdown
    separators: ["\n\n", "\n", " ", ""],
  });

  const docs = await splitter.createDocuments([markdown]);
  const textChunks = docs.map((doc) => doc.pageContent.trim());

  console.log(`[markdownChunker] Created ${textChunks.length} chunks`);

  return { textChunks };
}
