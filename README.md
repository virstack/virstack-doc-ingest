# 🚀 Virstack Doc Ingest

**Virstack Doc Ingest** is a high-performance, parallelized document ingestion and vectorization pipeline designed for scalable Retrieval-Augmented Generation (RAG) applications.

Powered by **LangGraph** for resilient orchestration, **OpenRouter / Gemini** for advanced vision/text extraction, and natively supporting **Upstash Vector** (with easily injectable custom adapters), this library acts as a universal bridge between your raw documents and your AI applications.

---

## ✨ Key Features

- **Universal Multi-Format Support:** Natively processes PDF, DOCX, XLSX, PPTX, CSV, TXT, HTML, EPUB, and Images (JPG, JPEG, PNG, GIF, WEBP, SVG).
- **Dual-Tier Parallelism:** Concurrently processes multiple files while simultaneously splitting and routing large PDFs into parallel Vision-API execution nodes.
- **Smart Type Routing:** Automatically identifies MIME types and dynamically routes files to the most optimal, parser-specific extraction graph.
- **Provider Agnostic Architecture:** Built entirely on Dependency Injection. Easily swap out LLMs, Embeddings, and Vector Databases (Pinecone, Qdrant, etc.) to fit your specific stack.
- **Gorgeous TUI (Text User Interface):** Features a beautiful, interactive command-line interface with interactive menus and live, non-tearing spinners.

---

## 🛠️ System Prerequisites

**IMPORTANT:** For parsing complex Office documents (e.g., `.docx`, `.pptx`, `.xlsx`, `.epub`), the pipeline relies on **LibreOffice** for high-fidelity conversion.

If you are only parsing PDFs, TXT, or CSV files, LibreOffice is **not** required.

### Installing LibreOffice:

- **macOS:** `brew install --cask libreoffice`
- **Ubuntu/Debian:** `sudo apt-get install libreoffice`
- **Windows:** Download the installer from [libreoffice.org](https://www.libreoffice.org/)

---

## 📦 Installation

You can install Virstack Doc Ingest globally to use as a standalone CLI tool, or locally to utilize its powerful API in your custom Node.js applications.

### Global Install (CLI Usage)

```bash
npm install -g virstack-doc-ingest
```

### Local Install (Library Usage)

```bash
npm install virstack-doc-ingest
```

---

## 💻 Usage Mode 1: Interactive CLI

The CLI offers a completely interactive, wizard-based experience.

### 1. Environment Configuration

Create a `.env` file in the directory where you plan to run the command:

```env
OPENROUTER_API_KEY=sk-or-v1-...
UPSTASH_VECTOR_URL=https://...
UPSTASH_VECTOR_TOKEN=...
LLM_MODEL=google/gemini-2.0-flash-001
EMBEDDING_MODEL=text-embedding-3-large
MAX_CONCURRENT_FILES=3
MAX_CONCURRENT_API_CALLS=15
```

> **Note on LangGraph Studio:** If you plan to visualize and run this pipeline directly within **LangGraph Studio**, you must also include your `LANGSMITH_API_KEY` (or `LANGCHAIN_API_KEY`) in your `.env` file to enable pipeline auto-initialization.


### 2. Running the Tool

To launch the interactive wizard (which allows you to select files, folders, or paste raw text):

```bash
virstack-doc-ingest
```

To bypass the wizard and directly ingest a specific file or directory:

```bash
# Process a single contract
virstack-doc-ingest ./documents/contract.pdf

# Process all documents in a directory
virstack-doc-ingest ./company-knowledge-base/

# Run with verbose, node-level diagnostics
virstack-doc-ingest ./documents/ --verbose
```

### Example Output

```text
 __     __  _                _                    _        ____                     ___                                _
 \ \   / / (_)  _ __   ___  | |_    __ _    ___  | | __   |  _ \    ___     ___    |_ _|  _ __     __ _    ___   ___  | |_
  \ \ / /  | | | '__| / __| | __|  / _` |  / __| | |/ /   | | | |  / _ \   / __|    | |  | '_ \   / _` |  / _ \ / __| | __|
   \ V /   | | | |    \__ \ | |_  | (_| | | (__  |   <    | |_| | | (_) | | (__     | |  | | | | | (_| | |  __/ \__ \ | |_
    \_/    |_| |_|    |___/  \__|  \__,_|  \___| |_|\_\   |____/   \___/   \___|   |___| |_| |_|  \__, |  \___| |___/  \__|
                                                                                                  |___/
┌   Welcome to Virstack Doc Ingest
│
◇  What file or directory would you like to process?
│  ./docs
│
◇  Found 2 file(s). Ready to process?
│  Yes, start ingestion
│
◇  ✔ Processing complete in 41.8s!
│
◇  Final Results: 2 succeeded, 0 failed
│
│    ✔ PRES1 CIS 6006-Updated Assessment.p │   28 chunks │   28 vectors │ 41.7s
│
│    ✔ VAI-020-021-Webhook-Implementation. │   12 chunks │   12 vectors │ 27.9s
│
└   Pipeline Finished Successfully!
```

---

## 🛠️ Usage Mode 2: Node.js Library (100% Provider Agnostic)

Virstack Doc Ingest is designed to be fully embedded into your own SaaS backends or ETL pipelines. It is rigidly decoupled from concrete implementations.

### Validating Supported File Types

You can import the list of natively supported file extensions directly from the library to validate user uploads before sending them to the ingestion pipeline.

```typescript
import { SUPPORTED_FILE_EXTENSIONS, batchGraph } from "virstack-doc-ingest";

const fileExt = ".jpg"; // e.g. path.extname(file)

if (!SUPPORTED_FILE_EXTENSIONS.includes(fileExt.toLowerCase())) {
  console.error(`Unsupported file type: ${fileExt}`);
  // Return a 400 Bad Request to the user
}
```

### Default Built-In Adapters

The package exports fully functional adapters for typical stacks:

- `OpenRouterLlmAdapter`
- `OpenRouterEmbeddingAdapter`
- `UpstashAdapter`

### Custom Adapter Example (Pinecone & Local LLM)

Here is how you inject your own custom logic into the LangGraph pipeline:

```typescript
import {
  initializeConfig,
  batchGraph,
  type VectorStoreAdapter,
  type LlmAdapter,
  type EmbeddingAdapter,
  OpenRouterEmbeddingAdapter,
} from "virstack-doc-ingest";
import { Pinecone } from "@pinecone-database/pinecone";

// 1. Define your own Vector Store connection
class CustomPineconeAdapter implements VectorStoreAdapter {
  async upsert(records: any[]) {
    /* ... */
  }
}

// 2. Define a custom Local AI processor (e.g. Ollama)
class LocalLLMAdapter implements LlmAdapter {
  async extractText(image: Buffer, mime: string) {
    return "extracted text";
  }
}

// 3. Mount the adapters to the global configuration
initializeConfig({
  llm: new LocalLLMAdapter(),
  embedder: new OpenRouterEmbeddingAdapter(
    process.env.OPENROUTER_API_KEY!,
    "text-embedding-3-large",
  ),
  vectorStore: new CustomPineconeAdapter(),
  maxConcurrentFiles: 5,
});

// 4. Invoke the ingestion orchestrator
async function processData() {
  const files = ["./uploads/report_2024.pdf", "./uploads/financials.xlsx"];

  console.log("Orchestrating batch ingestion...");
  const result = await batchGraph.invoke({ files });
  console.log("Success! Extracted documents:", result.results.length);
}

processData();
```

---

## ⚙️ Configuration Reference

When invoking `initializeConfig(options)`, the `VirstackDocIngestConfig` interface accepts the following properties:

| Property              | Type                 | Default      | Description                                                                       |
| :-------------------- | :------------------- | :----------- | :-------------------------------------------------------------------------------- |
| `llm`                 | `LlmAdapter`         | **Required** | Provider for extracting text (especially from PDF images via Vision APIs).        |
| `embedder`            | `EmbeddingAdapter`   | **Required** | Provider for transforming text chunks into vector arrays.                         |
| `vectorStore`         | `VectorStoreAdapter` | **Required** | Provider targeting your target vector database for final persistence.             |
| `openRouterApiKey`    | `string`             | `undefined`  | Required if utilizing the built-in OpenRouter adapters.                           |
| `maxConcurrentFiles`  | `number`             | `3`          | Maximum files mapped into the parallel processing queue simultaneously.           |
| `maxConcurrentApi`    | `number`             | `15`         | Global connection limit to prevent 429 Rate Limit errors across all active nodes. |
| `maxTokens`           | `number`             | `16384`      | Maximum allowable context window for the Vision LLM extraction.                   |
| `embeddingDimensions` | `number`             | `1536`       | Target dimensions for the output vectors.                                         |
| `chunkSize`           | `number`             | `1000`       | Target character length for Markdown recursive section chunking.                  |
| `chunkOverlap`        | `number`             | `100`        | Overlapping character padding between contiguous chunk segments.                  |
| `pdfPagesPerChunk`    | `number`             | `10`         | Number of PDF pages grouped together before a parallel Vision evaluation.         |
| `systemPrompt`        | `string`             | _(default)_  | Injection of custom instructions overriding the default extraction constraints.   |
