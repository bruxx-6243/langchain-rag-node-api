import { CONFIGS } from "@/constants";
import { QdrantClient } from "@qdrant/js-client-rest";

export interface DocumentMetadata extends Record<string, unknown> {
  filename: string;
  chunk_index: number;
  page_content: string;
}

export class QdrantService {
  private readonly client: QdrantClient;
  private readonly collectionName: string;

  constructor() {
    const url = `http://${CONFIGS.qdrant.host}:${CONFIGS.qdrant.port}`;
    this.client = new QdrantClient({ url });
    this.collectionName = CONFIGS.qdrant.collectionName;
  }

  async ensureCollection(dimensions: number): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (collectionExists) {
        console.log(`Qdrant collection already exists: ${this.collectionName}`);
      } else {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: dimensions,
            distance: "Cosine" as const,
          },
        });
        console.log(`Created Qdrant collection: ${this.collectionName}`);
      }
    } catch (error) {
      console.error("Error ensuring collection:", error);
      throw error;
    }
  }

  async upsertPoints(
    points: Array<{
      id: string | number;
      vector: number[];
      payload: DocumentMetadata;
    }>
  ): Promise<void> {
    try {
      const qdrantPoints = points.map((p) => {
        let pointId: string | number = p.id;
        if (typeof p.id === "string" && /^[0-9a-f]+$/i.test(p.id)) {
          try {
            pointId = Number.parseInt(p.id, 16);
          } catch {
            pointId = p.id;
          }
        }

        return {
          id: pointId,
          vector: p.vector,
          payload: p.payload,
        };
      });

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: qdrantPoints,
      });
      console.log(`Upserted ${points.length} points to Qdrant`);
    } catch (error) {
      console.error("Error upserting points:", error);
      throw error;
    }
  }

  async search(
    queryVector: number[],
    limit: number,
    filter?: Record<string, unknown>
  ) {
    try {
      const result = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        filter,
        with_payload: true,
      });
      return result;
    } catch (error) {
      console.error("Error searching Qdrant:", error);
      throw error;
    }
  }

  async deleteByFilename(filename: string): Promise<void> {
    try {
      // Check if collection exists first
      const collectionInfo = await this.getCollectionInfo();
      if (!collectionInfo) {
        console.log(
          `Collection ${this.collectionName} does not exist, nothing to delete for filename: ${filename}`
        );
        return;
      }

      const filter = {
        must: [
          {
            key: "filename",
            match: {
              value: filename,
            },
          },
        ],
      } as Record<string, unknown>;

      const result = await this.client.delete(this.collectionName, {
        wait: true,
        filter,
      });
      console.log(`Deleted vectors for filename: ${filename}`, result);
    } catch (error) {
      console.error("Error deleting by filename:", error);
      throw error;
    }
  }

  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return info;
    } catch (error) {
      console.error("Error getting collection info:", error);
      return null;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error("Qdrant connection check failed:", error);
      return false;
    }
  }

  async getAllPoints(limit = 10000) {
    try {
      const result = await this.client.scroll(this.collectionName, {
        limit,
        with_payload: true,
        with_vector: false,
      });
      return result.points;
    } catch (error) {
      console.error("Error getting all points:", error);
      throw error;
    }
  }

  async getPointsByFilename(filename: string, limit = 1000) {
    try {
      const filter = {
        must: [
          {
            key: "filename",
            match: {
              value: filename,
            },
          },
        ],
      } as Record<string, unknown>;

      const result = await this.client.scroll(this.collectionName, {
        limit,
        filter,
        with_payload: true,
        with_vector: false,
      });
      return result.points;
    } catch (error) {
      console.error("Error getting points by filename:", error);
      throw error;
    }
  }
}

export const qdrantService = new QdrantService();
