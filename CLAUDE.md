# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@virstack/doc-ingest` — a LangGraph-based document ingestion pipeline published to npm. It ships both as a library (`main: dist/index.js`) and as a CLI (`bin: virstack-doc-ingest` → `dist/cli.js`). ESM-only (`"type": "module"`), TypeScript with `module: NodeNext`.

## Commands

```bash
npm run dev            # run the CLI from source via tsx (src/cli.ts)
npm run dev -- ./docs --verbose   # pass a path + node-level logging
npm run build          # rm -rf dist && tsc
npm run type-check     # tsc --noEmit
npm run lint           # eslint src/   (lint:fix to autofix)
npm run format         # prettier --write src/   (format:check to verify)
npx langgraphjs dev    # LangGraph Studio, graphs declared in langgraph.json
```

There is **no test framework** in this repo. Verification is `type-check` + `lint` + running the CLI against a real document.

Publishing is automatic: any push to `main` triggers `.github/workflows/publish.yml`, which runs `npm ci && npm run build && npm publish`. Bump `package.json` version before merging to `main` or the publish step fails on a duplicate version.

## Architecture

### Two graphs, nested

`src/graphs/batchProcessor.ts` (exported as `batchGraph`) is the entrypoint. Its `workerNode` invokes the compiled single-document graph from `src/graphs/singleDocument.ts` once per input. Parallelism is two-tier:

1. **Batch level** — `distributeFiles` uses LangGraph's `Send` API to fan out one `workerNode` per file/rawText. Bounded by `{ maxConcurrency: pipelineConfig.maxConcurrentFiles }` passed at `batchGraph.invoke()` time (see `src/cli.ts:216`) — *not* by the config object itself.
2. **Document level** — `dispatchPdfChunks` fans out one `llmExtractionNode` per PDF chunk, also via `Send`. Bounded globally by `apiLimit` (a `p-limit` instance sized from `maxConcurrentApi`), which every LLM call is wrapped in.

`workerNode` catches all errors and converts them into `{ status: "error", ... }` result records, so a single bad file never fails the batch.

### Single-document flow

`fileTypeRouter` writes `mimeType` to state; the routing decision lives in the separate `routeByMimeType` conditional edge (four branches):

- `pdf` → `pdfSplitter`
- `convert` (DOCX/DOC/RTF/ODT/EPUB/PPTX/PPT/ODP) → `libreOfficeToPdf` → `pdfSplitter`
- `extract` (XLSX/XLS/CSV/TXT/HTML, raw text, and the unknown-MIME fallback) → `textExtractorNode`
- `image` → `imageReaderNode`

`pdfSplitter` and `imageReaderNode` both write base64 payloads into `state.pdfChunks` — the image node deliberately reuses that field so it can share `dispatchPdfChunks` and the same parallel LLM dispatch. All branches converge:

```
… → llmExtractionNode → (routeAfterLlm) → markdownMerger? → markdownNormalizer
  → saveMarkdown → markdownChunker → vectorEmbedderNode → vectorUpsertNode → END
```

`routeAfterLlm` distinguishes branches by state shape: `markdownParts` non-empty and `markdown` unset means the fan-out branch, so merge; otherwise normalize directly.

### State reducers

`src/core/state.ts` — `markdownParts` and `usage` are the only reducing channels. `markdownParts` concatenates (this is how parallel `Send` results merge), and `usage` sums tokens/cost across every node. Any node that spends tokens must return a `usage` object for cost tracking to stay accurate.

### Dependency injection

`src/core/config.ts` holds a module-level singleton `pipelineConfig` plus the `apiLimit` rate limiter, both set by `initializeConfig()`. Every node calls `requireInit()` first and reads `pipelineConfig` directly — there is no per-invocation config passing.

Three adapter contracts (`src/adapters/`): `LlmAdapter.generateMarkdown()`, `EmbeddingAdapter.embed()`, `VectorStoreAdapter.upsert()`. All three return `{ ..., usage }` where applicable. Built-ins are `OpenRouterLlmAdapter`, `OpenRouterEmbeddingAdapter`, `UpstashAdapter`; library consumers swap them out via `initializeConfig()`.

`getEnvConfig()` builds a config from `process.env` for CLI use. At the bottom of `config.ts` there is an auto-init side effect: if `OPENROUTER_API_KEY` **and** a LangSmith/LangChain key are present, config initializes on import — this exists purely so LangGraph Studio can run the graphs without going through the CLI.

### Logging

`src/core/logger.ts` exposes a swappable `logger` with a `LogSource` enum. Nodes always log via `logger.info(LogSource.X, ...)`, never `console.*`. The CLI injects a `@clack/prompts`-backed logger via `setLogger()` so pipeline output doesn't tear the live spinner; `info`/`success` are suppressed unless `--verbose`.

## Conventions

- **Relative imports must carry the `.js` extension** (NodeNext ESM), even in `.ts` source.
- New file-type support requires touching four places: `SUPPORTED_FILE_EXTENSIONS` in `src/core/constants.ts`, the MIME lists in `routeByMimeType`, `SUPPORTED_EXTENSIONS` in `src/cli.ts` (a separate hardcoded set that currently omits image extensions), and the public re-exports in `src/index.ts` if new types are introduced.
- `src/index.ts` is the package's public surface — anything consumers need must be re-exported there.
- LibreOffice is an external runtime dependency for the `convert` branch; the binary is resolved from `SOFFICE_PATH` or falls back to `soffice` on `PATH`.
- `saveMarkdown` always writes to `./outputs/<basename>_<md5-16>/full_content.md` relative to `process.cwd()`; `outputs/` is gitignored.
