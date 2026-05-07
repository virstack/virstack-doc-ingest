import { OpenRouter } from "@openrouter/sdk";

// --- CONTRACTS (Interfaces) ---

export interface LlmInput {
  systemPrompt: string;
  userText: string;
  /** @deprecated use base64Data instead */
  base64PdfChunk?: string;
  base64Data?: string;
  mimeType?: string;
}

export interface UsageData {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
}

export interface LlmAdapter {
  generateMarkdown(input: LlmInput): Promise<{ markdown: string; usage: UsageData }>;
}

export interface EmbeddingAdapter {
  embed(chunks: string[]): Promise<{ embeddings: number[][]; usage: UsageData }>;
}

// --- BUILT-IN ADAPTERS (For CLI to use by default) ---

export class OpenRouterLlmAdapter implements LlmAdapter {
  private client: OpenRouter;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenRouter({ apiKey });
    this.model = model;
  }

  async generateMarkdown(input: LlmInput): Promise<{ markdown: string; usage: UsageData }> {
    const userContent: Record<string, unknown>[] = [];

    const mediaObj = input.base64Data || input.base64PdfChunk;

    if (mediaObj) {
      const mime = input.mimeType || "application/pdf";
      userContent.push({
        type: "image_url",
        imageUrl: { url: `data:${mime};base64,${mediaObj}` },
      });
    }
    userContent.push({ type: "text", text: input.userText });

    const response = await this.client.chat.send({
      chatGenerationParams: {
        model: this.model,
        messages: [
          { role: "system", content: input.systemPrompt },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { role: "user", content: userContent as any },
        ],
        temperature: 0,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatResponse = response as Record<string, any>;
    const content = chatResponse.choices?.[0]?.message?.content;
    const usage: UsageData = {
      input_tokens: chatResponse.usage?.promptTokens || 0,
      output_tokens: chatResponse.usage?.completionTokens || 0,
      total_tokens: chatResponse.usage?.totalTokens || 0,
      cost: chatResponse.usage?.cost || 0,
    };

    const markdown = Array.isArray(content)
      ? content
          .map((item) => (item.type === "text" ? item.text : ""))
          .join("")
          .trim()
      : typeof content === "string"
        ? content.trim()
        : "";

    return { markdown, usage };
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

  async embed(chunks: string[]): Promise<{ embeddings: number[][]; usage: UsageData }> {
    const response = await this.client.embeddings.generate({
      requestBody: {
        model: this.model,
        input: chunks,
        dimensions: this.dimensions,
      },
    });

    if (typeof response === "string") {
      throw new Error(`OpenRouter Embeddings API returned unexpected string response: ${response}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const embeddingResponse = response as Record<string, any>;
    const usage: UsageData = {
      input_tokens: embeddingResponse.usage?.promptTokens || 0,
      output_tokens: 0, // embeddings API has no completion tokens
      total_tokens: embeddingResponse.usage?.totalTokens || 0,
      cost: embeddingResponse.usage?.cost || 0,
    };

    // Maintain chunk order based on OpenRouter response structure
    type EmbeddingItem = { index?: number; embedding: number[] | string };
    let embeddingsList: EmbeddingItem[] = response.data as EmbeddingItem[];
    if (embeddingsList.length > 0 && typeof embeddingsList[0].index === "number") {
      embeddingsList = embeddingsList.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    }

    const embeddings = embeddingsList.map((item) => {
      const emb = item.embedding;
      if (typeof emb === "string") {
        throw new Error("Received unexpected string embedding from OpenRouter");
      }
      return emb;
    });

    return { embeddings, usage };
  }
}
