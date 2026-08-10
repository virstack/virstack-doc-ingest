import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { initializeConfig } from "../src/core/config.js";
import { cleanupNode } from "../src/nodes/cleanupNode.js";
import { saveMarkdown } from "../src/nodes/saveMarkdown.js";
import { buildPipeline } from "../src/graphs/singleDocument.js";
import type { PipelineState } from "../src/core/state.js";
import type { VectorStoreAdapter, VectorRecord } from "../src/adapters/vectorStore.js";
import type { LlmAdapter, EmbeddingAdapter } from "../src/adapters/aiAdapters.js";

// Mock Adapters for testing
class MockVectorStoreAdapter implements VectorStoreAdapter {
  public records: VectorRecord[] = [];
  async upsert(records: VectorRecord[]): Promise<void> {
    this.records.push(...records);
  }
}

class MockLlmAdapter implements LlmAdapter {
  async generateMarkdown(): Promise<{ markdown: string; usage: { input_tokens: number; output_tokens: number; total_tokens: number; cost: number } }> {
    return {
      markdown: "# Mock Markdown\n\nExtracted content.",
      usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30, cost: 0.001 },
    };
  }
}

class MockEmbeddingAdapter implements EmbeddingAdapter {
  async embed(texts: string[]): Promise<{ embeddings: number[][]; usage: { input_tokens: number; output_tokens: number; total_tokens: number; cost: number } }> {
    return {
      embeddings: texts.map(() => [0.1, 0.2, 0.3]),
      usage: { input_tokens: 5, output_tokens: 0, total_tokens: 5, cost: 0.0005 },
    };
  }
}

describe("Automated Cleanup & keepLocalFiles", () => {
  beforeEach(() => {
    // Reset to default config before each test (keepLocalFiles: false)
    initializeConfig({
      vectorStore: new MockVectorStoreAdapter(),
      llm: new MockLlmAdapter(),
      embedder: new MockEmbeddingAdapter(),
      keepLocalFiles: false,
    });
  });

  test("cleanupNode removes temporary directories when keepLocalFiles is false (default)", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cleanup-test-"));
    const tempFile = path.join(tempDir, "temp.txt");
    await fs.writeFile(tempFile, "temporary content");

    // Verify it exists before cleanup
    const existsBefore = await fs.stat(tempDir).then(() => true).catch(() => false);
    assert.equal(existsBefore, true);

    const mockState = {
      tempDirs: [tempDir],
    } as unknown as PipelineState;

    await cleanupNode(mockState);

    // Verify directory is deleted
    const existsAfter = await fs.stat(tempDir).then(() => true).catch(() => false);
    assert.equal(existsAfter, false);
  });

  test("cleanupNode preserves directories when keepLocalFiles is true", async () => {
    initializeConfig({
      vectorStore: new MockVectorStoreAdapter(),
      llm: new MockLlmAdapter(),
      embedder: new MockEmbeddingAdapter(),
      keepLocalFiles: true,
    });

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cleanup-preserve-test-"));
    const tempFile = path.join(tempDir, "temp.txt");
    await fs.writeFile(tempFile, "preserve content");

    const mockState = {
      tempDirs: [tempDir],
    } as unknown as PipelineState;

    await cleanupNode(mockState);

    // Verify directory still exists
    const existsAfter = await fs.stat(tempDir).then(() => true).catch(() => false);
    assert.equal(existsAfter, true);

    // Clean up manually after test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("saveMarkdown returns tracked temp directory and cleans up via cleanupNode", async () => {
    const mockState = {
      markdown: "# Header\n\nHello world",
      filePath: "test_doc.txt",
    } as unknown as PipelineState;

    const saveResult = await saveMarkdown(mockState);
    assert.ok(saveResult.tempDirs && saveResult.tempDirs.length === 1);

    const savedDir = saveResult.tempDirs[0];
    const existsBefore = await fs.stat(savedDir).then(() => true).catch(() => false);
    assert.equal(existsBefore, true);

    // Run cleanupNode
    await cleanupNode({ tempDirs: [savedDir] } as unknown as PipelineState);

    const existsAfter = await fs.stat(savedDir).then(() => true).catch(() => false);
    assert.equal(existsAfter, false);
  });

  test("Full singleDocGraph pipeline deletes temporary files by default (keepLocalFiles: false)", async () => {
    initializeConfig({
      vectorStore: new MockVectorStoreAdapter(),
      llm: new MockLlmAdapter(),
      embedder: new MockEmbeddingAdapter(),
      keepLocalFiles: false,
    });

    const pipeline = buildPipeline();
    const result = await pipeline.invoke({
      rawText: "Sample text document for ingestion pipeline testing.",
    });

    assert.ok(result.textChunks.length > 0);
    assert.ok(result.vectors.length > 0);
    assert.ok(result.tempDirs && result.tempDirs.length > 0);

    // Verify each tracked temporary directory was deleted on disk by cleanupNode
    for (const dir of result.tempDirs) {
      const exists = await fs.stat(dir).then(() => true).catch(() => false);
      assert.equal(exists, false);
    }
  });

  test("Full singleDocGraph pipeline preserves output files when keepLocalFiles is true", async () => {
    initializeConfig({
      vectorStore: new MockVectorStoreAdapter(),
      llm: new MockLlmAdapter(),
      embedder: new MockEmbeddingAdapter(),
      keepLocalFiles: true,
    });

    const pipeline = buildPipeline();
    const result = await pipeline.invoke({
      rawText: "Sample text document for ingestion pipeline with keepLocalFiles true.",
    });

    assert.ok(result.textChunks.length > 0);
    assert.ok(result.tempDirs && result.tempDirs.length > 0);

    const outputDir = result.tempDirs[0];
    const exists = await fs.stat(outputDir).then(() => true).catch(() => false);
    assert.equal(exists, true);

    // Clean up manually after test
    await fs.rm(outputDir, { recursive: true, force: true });
  });
});
