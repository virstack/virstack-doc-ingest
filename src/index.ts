import path from "node:path";
import fs from "node:fs/promises";
import { buildPipeline } from "./pipeline.js";

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("Usage: npm run dev -- <file-path>");
    console.error("Example: npm run dev -- ./samples/document.pdf");
    process.exit(1);
  }

  // Resolve to absolute path
  const absolutePath = path.resolve(filePath);

  // Verify file exists
  try {
    await fs.access(absolutePath);
  } catch {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const fileStats = await fs.stat(absolutePath);
  console.log("═══════════════════════════════════════════════════════");
  console.log("  RAG Ingestion Pipeline");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  File:  ${path.basename(absolutePath)}`);
  console.log(`  Path:  ${absolutePath}`);
  console.log(`  Size:  ${(fileStats.size / 1024).toFixed(1)} KB`);
  console.log("═══════════════════════════════════════════════════════\n");

  const startTime = Date.now();

  // Build and invoke the pipeline
  const pipeline = buildPipeline();
  const result = await pipeline.invoke({
    filePath: absolutePath,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  Pipeline Complete");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  MIME type:      ${result.mimeType}`);
  console.log(`  Markdown:       ${result.markdown?.length ?? 0} chars`);
  console.log(`  Chunks created: ${result.textChunks?.length ?? 0}`);
  console.log(`  Vectors:        ${result.vectors?.length ?? 0} (${result.vectors?.[0]?.length ?? 0}d)`);
  console.log(`  Duration:       ${elapsed}s`);
  console.log("═══════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("\n❌ Pipeline failed:", err);
  process.exit(1);
});
