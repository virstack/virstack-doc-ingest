import { Annotation, StateGraph, Send, END } from "@langchain/langgraph";
import { graph as singleDocGraph } from "./singleDocument.js";
import path from "node:path";
import { logger, LogSource } from "../core/logger.js";

/**
 * State for the batch document processing graph.
 */
export const BatchStateAnnotation = Annotation.Root({
  /** Input: List of absolute file paths to process */
  files: Annotation<string[]>,
  
  /** Output: Collection of results from each individual document run */
  results: Annotation<any[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

export type BatchState = typeof BatchStateAnnotation.State;

/**
 * Orchestrator node: Prepares the batch and sends it to workers.
 */
function orchestrator(state: BatchState) {
  logger.info(LogSource.BATCH, `Starting processing of ${state.files.length} documents.`);
  return {};
}

/**
 * Conditional edge: Uses the Send API to spawn parallel worker nodes for each file.
 */
function distributeFiles(state: BatchState) {
  return state.files.map((file) => 
    new Send("workerNode", { filePath: file })
  );
}

/**
 * Worker node: Invokes the original single-document pipeline.
 */
async function workerNode(state: { filePath: string }) {
  const fileName = path.basename(state.filePath);
  const startTime = Date.now();

  try {
    // Invoke the existing compiled single-document graph
    const result = await singleDocGraph.invoke({ filePath: state.filePath });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return {
      results: [{
        file: fileName,
        status: "success",
        chunks: result.textChunks?.length ?? 0,
        vectors: result.vectors?.length ?? 0,
        durationSec: elapsed,
      }]
    };
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    return {
      results: [{
        file: fileName,
        status: "error",
        chunks: 0,
        vectors: 0,
        durationSec: elapsed,
        error: error.message,
      }]
    };
  }
}

/**
 * Final node: Prints a summary of the entire batch.
 */
function summaryNode(state: BatchState) {
  logger.success(LogSource.BATCH, "All documents processed.");
  return {};
}

// Build the batch graph
const batchGraph = new StateGraph(BatchStateAnnotation)
  .addNode("orchestrator", orchestrator)
  .addNode("workerNode", workerNode)
  .addNode("summaryNode", summaryNode)
  .addEdge("__start__", "orchestrator")
  .addConditionalEdges("orchestrator", distributeFiles, ["workerNode"])
  .addEdge("workerNode", "summaryNode")
  .addEdge("summaryNode", END);

export const graph = batchGraph.compile();
