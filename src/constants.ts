export const CONFIGS = {
  filePath: "uploads",
  maxFileSize: 5 * 1024 * 1024,
  chunkSize: 500,
  chunkOverlap: 150,
  bm25K: 8,
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    ttl: 24 * 60 * 60,
  },
  qdrant: {
    host: process.env.QDRANT_HOST || "localhost",
    port: Number(process.env.QDRANT_PORT) || 6333,
    collectionName: process.env.QDRANT_COLLECTION_NAME || "documents",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    embeddingDimensions: 1536,
  },
  hybridSearch: {
    bm25Weight: Number(process.env.HYBRID_SEARCH_BM25_WEIGHT) || 0.5,
    vectorWeight: Number(process.env.HYBRID_SEARCH_VECTOR_WEIGHT) || 0.5,
    topK: Number(process.env.HYBRID_SEARCH_TOP_K) || 8,
  },
};
