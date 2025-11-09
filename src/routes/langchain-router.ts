import { createAnthropicRagChain } from "@/anthropic";
import { CONFIGS } from "@/constants";
import { redisCache } from "@/lib/redis";
import { Storage } from "@/lib/storage";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { createHash } from "crypto";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const langchainRouter = new Hono();

langchainRouter.use("*", async (c, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof HTTPException) return err.getResponse();
    console.error("[UNHANDLED]", err);
    throw new HTTPException(500, { message: "Internal server error" });
  }
});

const hashQuestion = (q: string) =>
  createHash("sha256").update(q).digest("hex").slice(0, 12);

const answerCacheKey = (filename: string, question: string) =>
  `rag:${filename}:${hashQuestion(question)}`;

const chunkCacheKey = (filename: string) => `chunks:${filename}`;

const toString = (content: Buffer | string): string => {
  if (Buffer.isBuffer(content)) return content.toString("utf-8");
  return typeof content === "string" ? content : String(content);
};

langchainRouter.post("/upload-file", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    throw new HTTPException(400, { message: "No file uploaded" });
  }

  if (file.type !== "text/plain") {
    throw new HTTPException(400, {
      message: "Only plain-text (.txt) files allowed",
    });
  }
  if (file.size > CONFIGS.maxFileSize) {
    throw new HTTPException(400, { message: "File too large (max 5 MB)" });
  }

  const sample = await file.slice(0, 1024).arrayBuffer();
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample);
  } catch (error) {
    throw new HTTPException(400, {
      message: "File contains invalid UTF-8",
      cause: error,
    });
  }

  const storage = new Storage(CONFIGS.filePath);
  const { filename } = await storage.save(file);
  await redisCache.clearFileCache(filename);

  return c.json({ message: "File uploaded successfully", filename }, 200);
});

langchainRouter.post("/ask-question", async (c) => {
  const { question, filename } = await c.req.json();

  if (!question || !filename) {
    throw new HTTPException(400, { message: "Missing question or filename" });
  }

  const answerKey = answerCacheKey(filename, question);

  const cached = await redisCache.get(answerKey, filename);

  if (cached) {
    return c.json(
      { message: "From cache", question, answer: cached, cached: true },
      200
    );
  }

  const chunksKey = chunkCacheKey(filename);
  let docsJson = await redisCache.get(chunksKey, filename);
  let docs: any[];

  if (!docsJson) {
    const storage = new Storage(CONFIGS.filePath);
    const raw = await storage.load(filename);

    if (!raw) throw new HTTPException(404, { message: "File not found" });

    const text = toString(raw);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CONFIGS.chunkSize,
      chunkOverlap: CONFIGS.chunkOverlap,
      separators: ["\n\n", "\n", ".", " ", ""],
    });

    docs = await splitter.createDocuments([text]);

    await redisCache.set(chunksKey, filename, JSON.stringify(docs));
  } else {
    docs = JSON.parse(docsJson);
  }

  const retriever = BM25Retriever.fromDocuments(docs, { k: CONFIGS.bm25K });
  const chain = createAnthropicRagChain(retriever);
  const answer = await chain.invoke(question);

  await redisCache.set(answerKey, filename, answer);

  return c.json({ message: "Generated", question, answer, cached: false }, 200);
});

langchainRouter.get("/cache-stats", async (c) => {
  const stats = await redisCache.getStats();
  if (!stats) {
    throw new HTTPException(500, { message: "Failed to retrieve cache stats" });
  }
  return c.json({ message: "Cache stats", stats }, 200);
});

langchainRouter.delete("/clear-cache/:filename", async (c) => {
  const filename = c.req.param("filename");
  if (!filename) {
    throw new HTTPException(400, { message: "Filename required" });
  }
  await redisCache.clearFileCache(filename);
  return c.json({ message: "Cache cleared", filename }, 200);
});

export default langchainRouter;
