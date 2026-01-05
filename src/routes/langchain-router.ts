import { createAnthropicRagChain } from "@/anthropic";
import { CONFIGS } from "@/constants";
import { redisCache } from "@/lib/redis";
import { Storage } from "@/lib/storage";
import { answerCacheKey, convertBufferToString } from "@/lib/utils";
import { embeddingService } from "@/lib/embeddings";
import { qdrantService } from "@/lib/qdrant";
import { HybridRetriever } from "@/lib/hybrid-retriever";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createHash } from "node:crypto";

const langchainRagRouter = new Hono();

const paths = {
  UPLOAD_FILE: "/upload-file",
  ASK_QUESTION: "/ask-question",
  CACHE_STATS: "/cache-stats",
  CLEAR_CACHE: "/clear-cache/:filename",
};

langchainRagRouter.post(paths.UPLOAD_FILE, async (c) => {
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

  await qdrantService.ensureCollection(embeddingService.getDimensions());

  await redisCache.clearFileCache(filename);
  await qdrantService.deleteByFilename(filename);

  const raw = await storage.load(filename);
  if (!raw) {
    throw new HTTPException(500, { message: "Failed to load saved file" });
  }

  const text = convertBufferToString(raw);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CONFIGS.chunkSize,
    chunkOverlap: CONFIGS.chunkOverlap,
    separators: ["\n\n", "\n", ".", " ", ""],
  });

  const docs = await splitter.createDocuments([text]);

  const texts = docs.map((doc) => doc.pageContent);
  const embeddings = await embeddingService.embedDocuments(texts);

  await qdrantService.ensureCollection(embeddingService.getDimensions());

  const points = docs.map((doc, index) => {
    const idString = `${filename}-${index}`;
    const pointId = createHash("sha256")
      .update(idString)
      .digest("hex")
      .substring(0, 16);

    return {
      id: pointId,
      vector: embeddings[index],
      payload: {
        filename,
        chunk_index: index,
        page_content: doc.pageContent,
      },
    };
  });

  await qdrantService.upsertPoints(points);

  return c.json({ message: "File uploaded successfully", filename }, 200);
});

langchainRagRouter.post(paths.ASK_QUESTION, async (c) => {
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

  const storage = new Storage(CONFIGS.filePath);
  const raw = await storage.load(filename);

  if (!raw) throw new HTTPException(404, { message: "File not found" });

  const text = convertBufferToString(raw);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CONFIGS.chunkSize,
    chunkOverlap: CONFIGS.chunkOverlap,
    separators: ["\n\n", "\n", ".", " ", ""],
  });

  const docs = await splitter.createDocuments([text]);

  const retriever = new HybridRetriever(
    docs,
    filename,
    CONFIGS.hybridSearch.topK,
    "hybrid"
  );

  const chain = createAnthropicRagChain(retriever);
  const answer = await chain.invoke(question);

  await redisCache.set(answerKey, filename, answer);

  return c.json({ message: "Generated", question, answer, cached: false }, 200);
});

langchainRagRouter.get(paths.CACHE_STATS, async (c) => {
  const stats = await redisCache.getStats();

  if (!stats) {
    throw new HTTPException(500, { message: "Failed to retrieve cache stats" });
  }

  return c.json({ message: "Cache stats", stats }, 200);
});

langchainRagRouter.delete(paths.CLEAR_CACHE, async (c) => {
  const filename = c.req.param("filename");

  if (!filename) {
    throw new HTTPException(400, { message: "Filename required" });
  }

  await qdrantService.ensureCollection(embeddingService.getDimensions());
  await redisCache.clearFileCache(filename);
  await qdrantService.deleteByFilename(filename);
  return c.json({ message: "Cache cleared", filename }, 200);
});

export default langchainRagRouter;
