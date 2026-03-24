import { OpenRouter } from "@openrouter/sdk";

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
  private client: OpenRouter;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenRouter({ apiKey });
    this.model = model;
  }

  async generateMarkdown(input: LlmInput): Promise<string> {
    const userContent: any[] = [];
    
    if (input.base64PdfChunk) {
      userContent.push({
        type: "image_url",
        imageUrl: { url: `data:application/pdf;base64,${input.base64PdfChunk}` },
      });
    }
    userContent.push({ type: "text", text: input.userText });

    const response = await this.client.chat.send({
      chatGenerationParams: {
        model: this.model,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: userContent as any },
        ],
        temperature: 0,
      }
    });

    // The SDK returns ChatResponse when not streaming
    const chatResponse = response as any;
    const content = chatResponse.choices?.[0]?.message?.content;
    
    if (Array.isArray(content)) {
      return content.map(item => (item.type === 'text' ? item.text : '')).join('').trim();
    }
    
    return (typeof content === "string" ? content.trim() : "");
  }
}

export class OpenRouterEmbeddingAdapter implements EmbeddingAdapter {
  private client: OpenRouter;
  private model: string;
  private dimensions: number;

  constructor(apiKey: string, model: string, dimensions: number = 1536) {
    this.client = new OpenRouter({ apiKey });
    this.model = model;
    this.dimensions = dimensions;
  }

  async embed(chunks: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.generate({
      requestBody: {
        model: this.model,
        input: chunks,
        dimensions: this.dimensions,
      }
    });
    
    if (typeof response === "string") {
      throw new Error(`OpenRouter Embeddings API returned unexpected string response: ${response}`);
    }

    // Maintain chunk order based on OpenRouter response structure
    let embeddingsList = response.data;
    if (embeddingsList.length > 0 && typeof embeddingsList[0].index === "number") {
      embeddingsList = embeddingsList.sort((a: any, b: any) => a.index - b.index);
    }
    
    return embeddingsList.map((item: any) => {
      const emb = item.embedding;
      if (typeof emb === "string") {
         // Some models might return base64 if requested, but we expect float arrays
         throw new Error("Received unexpected string embedding from OpenRouter");
      }
      return emb;
    });
  }
}
