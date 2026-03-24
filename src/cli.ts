#!/usr/bin/env node
import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import { initializeConfig, getEnvConfig, pipelineConfig } from "./core/config.js";
import { batchGraph } from "./index.js";

// UI Libraries
import { intro, outro, text, spinner, select, isCancel, cancel, log } from "@clack/prompts";
import color from "picocolors";
import figlet from "figlet";

// Import the setLogger function
import { setLogger } from "./core/logger.js";

// Detect verbose flag
const isVerbose = process.argv.includes("--verbose");

// --- INJECT CLACK LOGGER ---
// This ensures that all internal pipeline logs are formatted beautifully
// and don't break the loading spinner!
setLogger({
  info: (source, message) => {
    if (isVerbose) {
      log.message(`${color.cyan(`[${source}]`)} ${color.dim(message)}`);
    }
  },
  success: (source, message) => {
    if (isVerbose) {
      log.message(`${color.green(`[${source}]`)} ${message}`);
    }
  },
  warn: (source, message) => {
    log.warn(`${color.yellow(`[${source}]`)} ${message}`);
  },
  error: (source, message, err) => {
    log.error(`${color.red(`[${source}]`)} ${message} ${err ? String(err) : ""}`);
  }
});

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf", ".docx", ".doc", ".rtf", ".odt", ".epub",
  ".pptx", ".ppt", ".odp", ".xlsx", ".xls", ".csv",
  ".txt", ".html",
]);

async function main() {
  console.clear();
  console.log(
    color.cyan(figlet.textSync("RAG Ingest", { horizontalLayout: "full" }))
  );

  intro(color.bgCyan(color.black(" Welcome to the RAG Ingestion Pipeline ")));

  // Improved argument parsing: Get the first non-flag argument as the path
  let targetPath = process.argv.slice(2).find((arg) => !arg.startsWith("-"));

  if (!targetPath) {
    const inputPath = await text({
      message: "What file or directory would you like to process?",
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

  try {
    initializeConfig(getEnvConfig());
  } catch (error: any) {
    cancel(`Initialization failed: ${error.message}`);
    process.exit(1);
  }

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

  // Start the spinner!
  const s = spinner();
  s.start(`Processing ${filesToProcess.length} document(s) with LangGraph...`);

  const batchStart = Date.now();

  try {
    const batchResult = await batchGraph.invoke(
      { files: filesToProcess },
      { maxConcurrency: pipelineConfig.maxConcurrentFiles },
    );

    const totalElapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
    const results = batchResult.results;

    // Stop the spinner successfully
    s.stop(color.green(`✔ Processing complete in ${totalElapsed}s!`));

    // Print Summary using Clack formatting
    const succeeded = results.filter((r: any) => r.status === "success");
    const failed = results.filter((r: any) => r.status === "error");

    log.step(`${color.bold("Final Results:")} ${color.green(`${succeeded.length} succeeded`)}, ${color.red(`${failed.length} failed`)}`);

    for (const r of results) {
      const fileName = r.file.padEnd(35).slice(0, 35);
      if (r.status === "success") {
        log.message(`  ${color.green("✔")} ${color.cyan(fileName)} │ ${r.chunks.toString().padStart(4)} chunks │ ${r.vectors.toString().padStart(4)} vectors │ ${r.durationSec}s`);
      } else {
        log.message(`  ${color.red("✖")} ${color.cyan(fileName)} │ ${color.red(r.error)}`);
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
