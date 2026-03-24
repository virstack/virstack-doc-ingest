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

## 🛠️ Usage: Library Mode (Agnostic Vector DB)

You can seamlessly integrate this pipeline into your existing Node.js backends or SaaS applications. **The pipeline is 100% Vector DB agnostic.** Instead of hardcoding a specific database, you can dynamically inject an adapter for Pinecone, Qdrant, Upstash, pgvector, or a local JSON file.

### Example: Injecting a Custom Pinecone Adapter

```typescript
import { initializeConfig, batchGraph, type VectorStoreAdapter, type VectorRecord } from "langchain-pipeline";
import { Pinecone } from '@pinecone-database/pinecone';

// 1. Create your own adapter by fulfilling the VectorStoreAdapter contract
class MyPineconeAdapter implements VectorStoreAdapter {
  private index: any;
  
  constructor() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_KEY! });
    this.index = pc.index("my-index");
  }

  async upsert(records: VectorRecord[]) {
    // Map the standard pipeline format to Pinecone's specific format
    const pineconeRecords = records.map(r => ({
      id: r.id,
      values: r.vector,
      metadata: r.metadata
    }));
    await this.index.upsert(pineconeRecords);
  }
}

// 2. Initialize the pipeline and inject your custom adapter
initializeConfig({
  openRouterApiKey: process.env.OPENROUTER_API_KEY!,
  llmModel: "google/gemini-2.5-pro",
  embeddingModel: "text-embedding-3-large",
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

*(Note: If you are building a quick script and just want to use Upstash Vector, you can import the built-in `UpstashAdapter` from the package and pass it as your `vectorStore` parameter).*

## ⚙️ Configuration Options

When calling `initializeConfig(options)`, you can pass the following parameters:

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `openRouterApiKey` | `string` | **Required** | Your OpenRouter API key. |
| `vectorStore` | `VectorStoreAdapter` | **Required** | The database adapter to receive the chunks & vectors. |
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
