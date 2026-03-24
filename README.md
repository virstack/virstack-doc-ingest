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
npm install -g rag-ingestion-pipeline
```

Or install locally to use in your Node.js project:
```bash
npm install rag-ingestion-pipeline
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

## 🛠️ Usage: Library Mode (100% Provider Agnostic)

You can seamlessly integrate this pipeline into your existing Node.js backends or SaaS applications. **The pipeline is 100% Provider Agnostic.** Instead of hardcoding specific AI models or databases, you can dynamically inject adapters for Pinecone, Qdrant, Ollama, OpenAI, Vertex AI, pgvector, or any other service.

### Example: Injecting Local LLMs and Custom DBs

```typescript
import { 
  initializeConfig, 
  batchGraph, 
  type VectorStoreAdapter,
  type LlmAdapter, 
  type EmbeddingAdapter,
  OpenRouterEmbeddingAdapter
} from "rag-ingestion-pipeline";
import { Pinecone } from '@pinecone-database/pinecone';

// 1. Create a custom Vector DB adapter
class MyPineconeAdapter implements VectorStoreAdapter { /* ... */ }

// 2. Create a custom local LLM adapter
class LocalOllamaAdapter implements LlmAdapter { /* ... */ }

// 3. Initialize the pipeline and inject your custom adapters
initializeConfig({
  llm: new LocalOllamaAdapter(),
  embedder: new OpenRouterEmbeddingAdapter(process.env.OPENROUTER_API_KEY!, "text-embedding-3-large"),
  vectorStore: new MyPineconeAdapter(), // Boom! Agnostic injection.
  maxConcurrentFiles: 3
});

async function processDocuments() {
  const files = [
    "./uploads/report_2024.pdf",
    "./uploads/financials.xlsx"
  ];

  console.log("Starting ingestion pipeline...");
  const result = await batchGraph.invoke({ files });
  console.dir(result.results, { depth: null });
}

processDocuments();
```

*(Note: If you are building a quick script, you can import the built-in `OpenRouterLlmAdapter`, `OpenRouterEmbeddingAdapter`, and `UpstashAdapter` from the package).*

## ⚙️ Configuration Options

When calling `initializeConfig(options)`, you can pass the following parameters:

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `llm` | `LlmAdapter` | **Required** | The adapter to handle Markdown extraction from text/PDF chunks. |
| `embedder` | `EmbeddingAdapter` | **Required** | The adapter to handle chunk vectorization. |
| `vectorStore` | `VectorStoreAdapter` | **Required** | The database adapter to receive the chunks & vectors. |
| `openRouterApiKey` | `string` | optional | Optional fallback for CLI backwards compatibility. |
| `maxConcurrentFiles`| `number` | `3` | Max files processed in parallel. |
| `maxConcurrentApi`  | `number` | `15` | Global rate limit for LLM/Embedding calls. |
| `maxTokens`         | `number` | `16384` | Max tokens per extraction call. |
| `embeddingDimensions`| `number` | `1536` | Output dimensions of the embedding model. |
| `chunkSize`         | `number` | `1000` | Max characters per text chunk. |
| `chunkOverlap`      | `number` | `100` | Overlap between text chunks. |
| `pdfPagesPerChunk`  | `number` | `10` | PDF pages per parallel Vision call. |
| `systemPrompt`      | `string` | default | Custom system prompt for extraction. |

---

## 📄 License
MIT
