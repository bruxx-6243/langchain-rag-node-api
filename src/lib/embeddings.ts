import { CONFIGS } from "@/constants";
import { OpenAIEmbeddings } from "@langchain/openai";

export class EmbeddingService {
  private readonly embeddings: OpenAIEmbeddings;

  constructor() {
    if (!CONFIGS.openai.apiKey) {
      throw new Error("OPENAI_API_KEY is required for embeddings");
    }

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: CONFIGS.openai.apiKey,
      modelName: CONFIGS.openai.embeddingModel,
      dimensions: CONFIGS.openai.embeddingDimensions,
    });
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw error;
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      console.error("Error generating query embedding:", error);
      throw error;
    }
  }

  getDimensions(): number {
    return CONFIGS.openai.embeddingDimensions;
  }
}

export const embeddingService = new EmbeddingService();

