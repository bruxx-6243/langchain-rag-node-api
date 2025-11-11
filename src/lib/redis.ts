import { CONFIGS } from "@/constants";
import Redis from "ioredis";

export class RedisCache {
  private readonly redisClient: Redis;
  private readonly ttl = CONFIGS.redis.ttl;

  constructor() {
    this.redisClient = new Redis({
      host: CONFIGS.redis.host,
      port: CONFIGS.redis.port,
      password: CONFIGS.redis.password,
    });

    this.redisClient.on("error", (error) => {
      console.error("Redis connection error:", error);
    });

    this.redisClient.on("connect", () => {
      console.log("Connected to Redis");
    });
  }

  private generateKey(question: string, filename: string): string {
    const questionHash = this.hashString(question);
    return `qa:${filename}:${questionHash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async set(question: string, filename: string, answer: string): Promise<void> {
    try {
      const key = this.generateKey(question, filename);
      const cacheData = {
        question,
        answer,
        filename,
        timestamp: Date.now(),
      };

      await this.redisClient.setex(key, this.ttl, JSON.stringify(cacheData));
      console.log(
        `Cached answer for question: ${question.substring(0, 50)}...`
      );
    } catch (error) {
      console.error("Redis set error:", error);
    }
  }

  async get(question: string, filename: string): Promise<string | null> {
    try {
      const key = this.generateKey(question, filename);
      const cached = await this.redisClient.get(key);

      if (cached) {
        const cacheData = JSON.parse(cached);
        console.log(`Cache hit for question: ${question.substring(0, 50)}...`);
        return cacheData.answer;
      }

      return null;
    } catch (error) {
      console.error("Redis get error:", error);
      return null;
    }
  }

  async exists(question: string, filename: string): Promise<boolean> {
    try {
      const key = this.generateKey(question, filename);
      const exists = await this.redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      console.error("Redis exists error:", error);
      return false;
    }
  }

  async delete(question: string, filename: string): Promise<void> {
    try {
      const key = this.generateKey(question, filename);
      await this.redisClient.del(key);
      console.log(
        `Deleted cache for question: ${question.substring(0, 50)}...`
      );
    } catch (error) {
      console.error("Redis delete error:", error);
    }
  }

  async clearFileCache(filename: string): Promise<void> {
    try {
      const pattern = `qa:${filename}:*`;
      const keys = await this.redisClient.keys(pattern);

      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        console.log(
          `Cleared ${keys.length} cached items for file: ${filename}`
        );
      }
    } catch (error) {
      console.error("Redis clear file cache error:", error);
    }
  }

  async getStats(): Promise<{ totalKeys: number; memoryUsage: string }> {
    try {
      const keys = await this.redisClient.keys("qa:*");
      const info = await this.redisClient.info("memory");

      const memoryLine = info
        .split("\n")
        .find((line) => line.startsWith("used_memory_human:"));
      const memoryUsage = memoryLine ? memoryLine.split(":")[1] : "Unknown";

      return {
        totalKeys: keys.length,
        memoryUsage: memoryUsage.trim(),
      };
    } catch (error) {
      console.error("Redis stats error:", error);
      return { totalKeys: 0, memoryUsage: "Unknown" };
    }
  }

  async close(): Promise<void> {
    await this.redisClient.quit();
  }
}

export const redisCache = new RedisCache();
