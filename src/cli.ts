#!/usr/bin/env node
import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import { initializeConfig, getEnvConfig, pipelineConfig } from "./core/config.js";
import { batchGraph } from "./index.js";

// --- Import the new UI libraries ---
import { intro, outro, text, spinner, select, isCancel, cancel } from "@clack/prompts";
import color from "picocolors";
import figlet from "figlet";

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf", ".docx", ".doc", ".rtf", ".odt", ".epub",
  ".pptx", ".ppt", ".odp", ".xlsx", ".xls", ".csv",
  ".txt", ".html",
]);

async function main() {
  // 1. Print a cool ASCII Art Banner
  console.clear();
  console.log(
    color.cyan(
      figlet.textSync("RAG Ingest", { horizontalLayout: "full" })
    )
  );

  // 2. Start the Clack Prompt
  intro(color.bgCyan(color.black(" Welcome to the RAG Ingestion Pipeline ")));

  let targetPath = process.argv[2];

  // 3. INTERACTIVE WIZARD: If no path was provided, ask for it!
  if (!targetPath) {
    const inputPath = await text({
      message: "What would you like to process?",
      placeholder: "./documents/ or ./sample.pdf",
      validate(value) {
        if (!value || value.length === 0) return "Path is required!";
      },
    });

    if (isCancel(inputPath)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }
    targetPath = inputPath as string;
  }

  const absolutePath = path.resolve(targetPath);

  // Initialize Config
  try {
    initializeConfig(getEnvConfig());
  } catch (error: any) {
    cancel(`Initialization failed: ${error.message}`);
    process.exit(1);
  }

  // 4. Check if path exists
  const stats = await fs.stat(absolutePath).catch(() => {
    cancel(`Path not found: ${absolutePath}`);
    process.exit(1);
  });

  let filesToProcess: string[] = [];

  if (stats.isDirectory()) {
    const entries = await fs.readdir(absolutePath);
    filesToProcess = entries
      .filter((f) => SUPPORTED_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map((f) => path.resolve(absolutePath, f));

    if (filesToProcess.length === 0) {
      cancel(`No supported files found in: ${absolutePath}`);
      process.exit(1);
    }
  } else {
    filesToProcess = [absolutePath];
  }

  const isBatch = filesToProcess.length > 1;

  // 5. Interactive Confirmation Dropdown
  const confirm = await select({
    message: `Found ${filesToProcess.length} file(s). Ready to process?`,
    options: [
      { value: true, label: "Yes, start ingestion" },
      { value: false, label: "No, cancel" },
    ],
  });

  if (isCancel(confirm) || !confirm) {
    cancel("Operation cancelled by user.");
    process.exit(0);
  }

  // 6. Beautiful Loading Spinner
  const s = spinner();
  s.start(`Processing ${filesToProcess.length} document(s) with LangGraph...`);

  const batchStart = Date.now();

  try {
    // Invoke the graph
    const batchResult = await batchGraph.invoke(
      { files: filesToProcess },
      { maxConcurrency: pipelineConfig.maxConcurrentFiles },
    );

    const totalElapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
    const results = batchResult.results;

    // Stop the spinner
    s.stop(color.green(`✔ Processing complete in ${totalElapsed}s!`));

    // 7. Print Summary
    const succeeded = results.filter((r: any) => r.status === "success");
    const failed = results.filter((r: any) => r.status === "error");

    console.log(`\n  ${color.bold("Results:")} ${color.green(`${succeeded.length} succeeded`)}, ${color.red(`${failed.length} failed`)}\n`);

    for (const r of results) {
      const fileName = color.cyan(r.file.padEnd(30).slice(0, 30));
      if (r.status === "success") {
        console.log(`  ✅ ${fileName} │ ${r.chunks} chunks │ ${r.vectors} vectors │ ${r.durationSec}s`);
      } else {
        console.log(`  ❌ ${fileName} │ ${color.red(r.error)}`);
      }
    }

    outro(color.bgGreen(color.black(" Pipeline Finished Successfully! ")));
    
    if (failed.length > 0) process.exit(1);

  } catch (err: any) {
    s.stop(color.red("✖ Pipeline crashed"));
    cancel(err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
