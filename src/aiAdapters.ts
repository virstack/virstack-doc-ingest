import { OpenAI } from "openai";

// --- CONTRACTS (Interfaces) ---

export interface LlmInput {
  systemPrompt: string;
  userText: string;
  base64PdfChunk?: string; // Optional: Used when processing PDF Vision chunks
}

export interface LlmAdapter {
  generateMarkdown(input: LlmInput): Promise<string>;
}

export interface EmbeddingAdapter {
  embed(chunks: string[]): Promise<number[][]>;
}

// --- BUILT-IN ADAPTERS (For CLI to use by default) ---

export class OpenRouterLlmAdapter implements LlmAdapter {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey });
    this.model = model;
  }

  async generateMarkdown(input: LlmInput): Promise<string> {
    const userContent: any[] = [];
    
    if (input.base64PdfChunk) {
      userContent.push({
        type: "file",
        file: { filename: "chunk.pdf", file_data: `data:application/pdf;base64,${input.base64PdfChunk}` },
      });
    }
    userContent.push({ type: "text", text: input.userText });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: userContent as any },
      ],
      temperature: 0,
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  }
}

export class OpenRouterEmbeddingAdapter implements EmbeddingAdapter {
  private client: OpenAI;
  private model: string;
  private dimensions: number;

  constructor(apiKey: string, model: string, dimensions: number = 1536) {
    this.client = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey });
    this.model = model;
    this.dimensions = dimensions;
  }

  async embed(chunks: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: chunks,
      dimensions: this.dimensions,
    } as any);
    
    // Sort to maintain chunk order
    const sorted = response.data.sort((a: any, b: any) => a.index - b.index);
    return sorted.map((item: any) => item.embedding);
  }
}
