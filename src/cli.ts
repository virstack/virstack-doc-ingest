#!/usr/bin/env node
import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import { initializeConfig, getEnvConfig, pipelineConfig } from "./core/config.js";
import { batchGraph } from "./index.js";

/* ------------------------------------------------------------------ */
/*  Supported file extensions                                         */
/* ------------------------------------------------------------------ */
const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".doc",
  ".rtf",
  ".odt",
  ".epub",
  ".pptx",
  ".ppt",
  ".odp",
  ".xlsx",
  ".xls",
  ".csv",
  ".txt",
  ".html",
]);

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */
async function main() {
  try {
    // 1. Initialize using environment variables from config.js
    initializeConfig(getEnvConfig());
  } catch (error: any) {
    console.error(`❌ Initialization failed: ${error.message}`);
    process.exit(1);
  }

  const targetPath = process.argv[2];

  if (!targetPath) {
    console.error("Usage: npm run dev -- <file-or-directory>");
    console.error("  Single file:  npm run dev -- ./samples/document.pdf");
    console.error("  Directory:    npm run dev -- ./samples/");
    process.exit(1);
  }

  const absolutePath = path.resolve(targetPath);

  // Determine if the target is a file or directory
  const stats = await fs.stat(absolutePath).catch(() => {
    console.error(`Not found: ${absolutePath}`);
    process.exit(1);
  });

  let filesToProcess: string[] = [];

  if (stats!.isDirectory()) {
    const entries = await fs.readdir(absolutePath);
    filesToProcess = entries
      .filter((f) => SUPPORTED_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map((f) => path.resolve(absolutePath, f));

    if (filesToProcess.length === 0) {
      console.error(`No supported files found in: ${absolutePath}`);
      console.error(`Supported: ${[...SUPPORTED_EXTENSIONS].join(", ")}`);
      process.exit(1);
    }
  } else {
    filesToProcess = [absolutePath];
  }

  const isBatch = filesToProcess.length > 1;

  console.log("═══════════════════════════════════════════════════════");
  console.log("  RAG Ingestion Pipeline");
  console.log("═══════════════════════════════════════════════════════");
  if (isBatch) {
    console.log(`  Mode:        Batch (${filesToProcess.length} files)`);
    console.log(`  Concurrency: Controlled by LangGraph`);
    console.log(`  Directory:   ${absolutePath}`);
  } else {
    console.log(`  Mode:        Single file`);
    console.log(`  File:        ${path.basename(filesToProcess[0])}`);
    console.log(`  Path:        ${filesToProcess[0]}`);
  }
  console.log("═══════════════════════════════════════════════════════\n");

  const batchStart = Date.now();

  // Use the native Batch Orchestrator graph WITH a concurrency limit
  const batchResult = await batchGraph.invoke(
    { files: filesToProcess },
    { maxConcurrency: pipelineConfig.maxConcurrentFiles },
  );

  const results = batchResult.results;
  const totalElapsed = ((Date.now() - batchStart) / 1000).toFixed(1);

  // Print summary
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  Pipeline Complete");
  console.log("═══════════════════════════════════════════════════════");

  if (isBatch) {
    const succeeded = results.filter((r: any) => r.status === "success");
    const failed = results.filter((r: any) => r.status === "error");

    console.log(
      `\n  Results: ${succeeded.length} succeeded, ${failed.length} failed\n`,
    );

    // Summary table
    console.log(
      "  ┌─────────────────────────────────────────┬──────────┬────────┬─────────┬──────────┐",
    );
    console.log(
      "  │ File                                    │ Status   │ Chunks │ Vectors │ Duration │",
    );
    console.log(
      "  ├─────────────────────────────────────────┼──────────┼────────┼─────────┼──────────┤",
    );

    for (const r of results) {
      const file = r.file.padEnd(39).slice(0, 39);
      const status = r.status === "success" ? "✅ OK   " : "❌ FAIL ";
      const chunks = String(r.chunks).padStart(6);
      const vectors = String(r.vectors).padStart(7);
      const duration = `${r.durationSec}s`.padStart(8);
      console.log(
        `  │ ${file} │ ${status} │ ${chunks} │ ${vectors} │ ${duration} │`,
      );
    }

    console.log(
      "  └─────────────────────────────────────────┴──────────┴────────┴─────────┴──────────┘",
    );

    if (failed.length > 0) {
      console.log("\n  Failed files:");
      for (const r of failed) {
        console.log(`    • ${r.file}: ${r.error}`);
      }
    }
  } else {
    const r = results[0];
    console.log(`  File:           ${r.file}`);
    console.log(`  Status:         ${r.status}`);
    console.log(`  Chunks created: ${r.chunks}`);
    console.log(`  Vectors:        ${r.vectors}`);
  }

  console.log(`\n  Total duration: ${totalElapsed}s`);
  console.log("═══════════════════════════════════════════════════════");

  // Exit with error code if any file failed
  const hasErrors = results.some((r: any) => r.status === "error");
  if (hasErrors) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ Pipeline failed:", err);
  process.exit(1);
});
