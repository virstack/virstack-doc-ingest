# 🚀 RAG Ingestion Pipeline

A high-performance, parallelized document ingestion and vectorization pipeline for Retrieval-Augmented Generation (RAG). Built with **LangGraph**, powered by **Gemini / OpenRouter**, and indexed in **Upstash Vector**.

This package handles complex file routing, parallel chunking, LibreOffice conversion, markdown normalization, and embeddings—all in one seamless flow.

## ✨ Features
* **Multi-Format Support:** PDF, DOCX, XLSX, PPTX, CSV, TXT, HTML, EPUB, and more.
* **Dual Parallelism:** Processes multiple files concurrently and splits large PDFs into parallel Vision-API chunks.
* **Smart Routing:** Automatically detects MIME types and routes files to the optimal extraction method.
* **Two Ways to Use:** Run it directly from your terminal as a CLI tool, or import it into your Node.js application as a library.

---

## 🛠️ Prerequisites

**CRITICAL: LibreOffice is required for processing Office documents.** If you intend to process `.docx`, `.pptx`, `.rtf`, or `.epub` files, you must have LibreOffice installed on your system.

* **macOS:** `brew install --cask libreoffice`
* **Ubuntu/Debian:** `sudo apt-get install libreoffice`
* **Windows:** Download from [libreoffice.org](https://www.libreoffice.org/)

*(Note: If you are only processing PDFs, CSVs, or TXT files, LibreOffice is not required.)*

---

## 📦 Installation

Install globally to use as a CLI tool:
```bash
npm install -g langchain-pipeline
```

Or install locally to use in your Node.js project:
```bash
npm install langchain-pipeline
```

---

## 💻 Usage: CLI Mode

When installed globally, you can run the pipeline directly from your terminal.

1. Create a `.env` file in your working directory with your API keys:
```env
OPENROUTER_API_KEY=sk-or-v1-...
UPSTASH_VECTOR_URL=https://...
UPSTASH_VECTOR_TOKEN=...
LLM_MODEL=google/gemini-2.0-flash-001
EMBEDDING_MODEL=text-embedding-3-large
MAX_CONCURRENT_FILES=3
MAX_CONCURRENT_API_CALLS=15
```

2. Run the ingestion command on a single file or an entire directory:
```bash
# Process a single file
rag-ingest ./documents/contract.pdf

# Process a whole folder
rag-ingest ./documents/
```

---

## 🛠️ Usage: Library Mode

You can seamlessly integrate this pipeline into your existing Node.js backends or SaaS applications. No `.env` file is required; simply pass your configuration dynamically.

```typescript
import { initializeConfig, batchGraph } from "langchain-pipeline";

// 1. Initialize the configuration with your API keys
initializeConfig({
  openRouterApiKey: "sk-or-v1-...",
  upstashUrl: "https://...",
  upstashToken: "...",
  llmModel: "google/gemini-2.0-flash-001",
  embeddingModel: "text-embedding-3-large",
  maxConcurrentFiles: 3
});

async function processDocuments() {
  const files = [
    "./uploads/report_2024.pdf",
    "./uploads/financials.xlsx"
  ];

  console.log("Starting ingestion pipeline...");
  
  // 2. Invoke the batch graph
  const result = await batchGraph.invoke({ files });

  console.log("Processing complete!");
  console.dir(result.results, { depth: null });
}

processDocuments();
```

## ⚙️ Configuration Options

When calling `initializeConfig(options)`, you can pass the following parameters:

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `openRouterApiKey` | `string` | **Required** | Your OpenRouter API key. |
| `upstashUrl` | `string` | **Required** | Upstash Vector database URL. |
| `upstashToken` | `string` | **Required** | Upstash Vector REST token. |
| `llmModel` | `string` | **Required** | Model used for markdown extraction. |
| `embeddingModel` | `string` | **Required** | Model used for vector embeddings. |
| `maxConcurrentFiles`| `number` | `3` | Max files processed in parallel. |
| `maxConcurrentApi`  | `number` | `15` | Global rate limit for LLM/Embedding calls. |
| `maxTokens`         | `number` | `16384` | Max tokens per extraction call. |
| `chunkSize`         | `number` | `1000` | Max characters per text chunk. |
| `chunkOverlap`      | `number` | `100` | Overlap between text chunks. |
| `pdfPagesPerChunk`  | `number` | `10` | PDF pages per parallel Vision call. |
| `systemPrompt`      | `string` | (Internal) | Override the default extraction prompt. |

---

## 📄 License
MIT
