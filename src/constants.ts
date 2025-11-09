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
};
