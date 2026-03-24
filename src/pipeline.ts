import { StateGraph, END, Send } from "@langchain/langgraph";
import { PipelineStateAnnotation, type PipelineState } from "./state.js";
import { fileTypeRouter, routeByMimeType } from "./nodes/fileTypeRouter.js";
import { pdfSplitter } from "./nodes/pdfSplitter.js";
import { llmExtractionNode, routeAfterLlm } from "./nodes/llmExtractionNode.js";
import { markdownMerger } from "./nodes/markdownMerger.js";

import { textExtractorNode } from "./nodes/textExtractorNode.js";
import { markdownNormalizer } from "./nodes/markdownNormalizer.js";
import { markdownChunker } from "./nodes/markdownChunker.js";
import { vectorEmbedderNode } from "./nodes/vectorEmbedderNode.js";
import { vectorUpsertNode } from "./nodes/vectorUpsertNode.js";
import { saveMarkdown } from "./nodes/saveMarkdown.js";
import { libreOfficeToPdf } from "./nodes/libreOfficeToPdf.js";

/**
 * Builds and compiles the RAG ingestion pipeline as a LangGraph StateGraph.
 *
 * Flow:
 *   START → fileTypeRouter
 *     ├─ "pdf"     → pdfSplitter → [llmExtractionNode (Parallel)] → markdownMerger → markdownNormalizer
 *     ├─ "convert" → libreOfficeToPdf → pdfSplitter → (same as pdf branch)
 *     └─ "extract" → textExtractorNode → llmExtractionNode → markdownNormalizer
 *   markdownNormalizer → saveMarkdown → markdownChunker → vectorEmbedderNode → vectorUpsertNode → END
 */

/**
 * Returns an array of 'Send' objects to process each PDF chunk in parallel.
 */
function dispatchPdfChunks(state: PipelineState) {
  if (!state.pdfChunks || state.pdfChunks.length === 0) {
    console.warn("[dispatchPdfChunks] No PDF chunks found to process.");
    return [];
  }
  return state.pdfChunks.map((chunk, index) => {
    return new Send("llmExtractionNode", {
      chunk,
      index,
      totalChunks: state.pdfChunks.length,
    });
  });
}
export function buildPipeline() {
  const graph = new StateGraph(PipelineStateAnnotation)
    // ── Phase 1: Routing ──
    .addNode("fileTypeRouter", fileTypeRouter)

    // ── Phase 2a: PDF Branch ──
    .addNode("libreOfficeToPdf", libreOfficeToPdf)
    .addNode("pdfSplitter", pdfSplitter)
    .addNode("markdownMerger", markdownMerger)

    // ── Phase 2b: Text / Data Extraction Branch ──
    .addNode("textExtractorNode", textExtractorNode)
    .addNode("llmExtractionNode", llmExtractionNode)

    // ── Phase 3: Normalization & Chunking ──
    .addNode("markdownNormalizer", markdownNormalizer)
    .addNode("saveMarkdown", saveMarkdown)
    .addNode("markdownChunker", markdownChunker)

    // ── Phase 4: Embedding & Indexing ──
    .addNode("vectorEmbedderNode", vectorEmbedderNode)
    .addNode("vectorUpsertNode", vectorUpsertNode)

    // ── Edges ──
    // Start → Router
    .addEdge("__start__", "fileTypeRouter")

    // Router → conditional branch
    .addConditionalEdges("fileTypeRouter", routeByMimeType, {
      pdf: "pdfSplitter",
      convert: "libreOfficeToPdf",
      extract: "textExtractorNode",
    })

    // Convert branch: LibreOffice → pdfSplitter → (joins PDF branch)
    .addEdge("libreOfficeToPdf", "pdfSplitter")

    // PDF branch dispatcher
    .addConditionalEdges("pdfSplitter", dispatchPdfChunks, ["llmExtractionNode"])

    // Unified Document/Text branch flow
    .addEdge("textExtractorNode", "llmExtractionNode")

    // After llmExtractionNode, conditionally merge PDF chunks or normalize Text
    .addConditionalEdges("llmExtractionNode", routeAfterLlm, {
      markdownMerger: "markdownMerger",
      markdownNormalizer: "markdownNormalizer",
    })

    // If PDF branch, finish merger
    .addEdge("markdownMerger", "markdownNormalizer")

    // Shared tail: normalize → save → chunk → embed → upsert → end
    .addEdge("markdownNormalizer", "saveMarkdown")
    .addEdge("saveMarkdown", "markdownChunker")
    .addEdge("markdownChunker", "vectorEmbedderNode")
    .addEdge("vectorEmbedderNode", "vectorUpsertNode")
    .addEdge("vectorUpsertNode", END);

  return graph.compile();
}

/**
 * The compiled graph instance.
 * Exported specifically for LangGraph Studio and the LangGraph CLI.
 */
export const graph = buildPipeline();
