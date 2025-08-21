export const CONFIGS = {
  filePath: "uploads",
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    ttl: 24 * 60 * 60,
  },
};
