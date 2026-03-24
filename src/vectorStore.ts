import { Index } from "@upstash/vector";

/**
 * The standard shape of a record that the pipeline will produce.
 */
export interface VectorRecord {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
}

/**
 * The contract that any vector database adapter must follow.
 */
export interface VectorStoreAdapter {
  upsert(records: VectorRecord[]): Promise<void>;
}

/**
 * Built-in adapter for Upstash Vector.
 * Used by default when running via the CLI.
 */
export class UpstashAdapter implements VectorStoreAdapter {
  private index: Index;

  constructor(url: string, token: string) {
    this.index = new Index({ url, token });
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    const upstashRecords = records.map((r) => ({
      id: r.id,
      vector: r.vector,
      metadata: r.metadata,
      // For Upstash, the string payload goes in 'data' usually, but metadata is fine.
      data: r.metadata.text || "",
    }));

    await this.index.upsert(upstashRecords);
  }
}
