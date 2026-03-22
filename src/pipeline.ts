import { StateGraph, END, Send } from "@langchain/langgraph";
import { PipelineStateAnnotation, type PipelineState } from "./state.js";
import { fileTypeRouter, routeByMimeType } from "./nodes/fileTypeRouter.js";
import { pdfSplitter } from "./nodes/pdfSplitter.js";
import { processPdfChunk } from "./nodes/processPdfChunk.js";
import { markdownMerger } from "./nodes/markdownMerger.js";

import { officeparserNode } from "./nodes/officeparserNode.js";
import { geminiExtraction } from "./nodes/geminiExtraction.js";
import { markdownNormalizer } from "./nodes/markdownNormalizer.js";
import { markdownChunker } from "./nodes/markdownChunker.js";
import { openrouterEmbedder } from "./nodes/openrouterEmbedder.js";
import { upstashUpsert } from "./nodes/upstashUpsert.js";
import { saveMarkdown } from "./nodes/saveMarkdown.js";

/**
 * Builds and compiles the RAG ingestion pipeline as a LangGraph StateGraph.
 *
 * Flow:
 *   START → fileTypeRouter
 *     ├─ "pdf"           → pdfSplitter → [processPdfChunk (Parallel)] → markdownMerger → markdownNormalizer
 *     ├─ "office"        → officeparserNode → geminiExtraction → markdownNormalizer
 *     └─ "text"          → officeparserNode → geminiExtraction → markdownNormalizer
 *   markdownNormalizer → saveMarkdown → markdownChunker → openrouterEmbedder → upstashUpsert → END
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
    return new Send("processPdfChunk", {
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
    .addNode("pdfSplitter", pdfSplitter)
    .addNode("processPdfChunk", processPdfChunk)
    .addNode("markdownMerger", markdownMerger)

    // ── Phase 2b: Office / Text Branch ──
    .addNode("officeparserNode", officeparserNode)
    .addNode("geminiExtraction", geminiExtraction)

    // ── Phase 3: Normalization & Chunking ──
    .addNode("markdownNormalizer", markdownNormalizer)
    .addNode("saveMarkdown", saveMarkdown)
    .addNode("markdownChunker", markdownChunker)

    // ── Phase 4: Embedding & Indexing ──
    .addNode("openrouterEmbedder", openrouterEmbedder)
    .addNode("upstashUpsert", upstashUpsert)

    // ── Edges ──
    // Start → Router
    .addEdge("__start__", "fileTypeRouter")

    // Router → conditional branch
    .addConditionalEdges("fileTypeRouter", routeByMimeType, {
      pdf: "pdfSplitter",
      office: "officeparserNode",
      text: "officeparserNode",
    })

    // PDF branch flow
    .addConditionalEdges("pdfSplitter", dispatchPdfChunks, ["processPdfChunk"])
    .addEdge("processPdfChunk", "markdownMerger")
    .addEdge("markdownMerger", "markdownNormalizer")

    // Office/text branch flow
    .addEdge("officeparserNode", "geminiExtraction")
    .addEdge("geminiExtraction", "markdownNormalizer")

    // Shared tail: normalize → save → chunk → embed → upsert → end
    .addEdge("markdownNormalizer", "saveMarkdown")
    .addEdge("saveMarkdown", "markdownChunker")
    .addEdge("markdownChunker", "openrouterEmbedder")
    .addEdge("openrouterEmbedder", "upstashUpsert")
    .addEdge("upstashUpsert", END);

  return graph.compile();
}

/**
 * The compiled graph instance.
 * Exported specifically for LangGraph Studio and the LangGraph CLI.
 */
export const graph = buildPipeline();
