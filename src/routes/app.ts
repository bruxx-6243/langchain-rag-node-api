import { Hono } from "hono";
import { Storage } from "@/lib/storage";
import { CONFIGS } from "@/constants";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { createAnthropicRagChain } from "@/anthropic";
import { redisCache } from "@/lib/redis";

const app = new Hono();

app.post("/upload-file", async (ctx) => {
  try {
    const formData = await ctx.req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return ctx.json({ message: "No file uploaded" }, 400);
    }

    if (!file.name.endsWith(".txt")) {
      return ctx.json({ message: "File must be a .txt file" }, 400);
    }

    const storage = new Storage(CONFIGS.filePath);

    const { filename } = await storage._store(file);

    await redisCache.clearFileCache(filename);

    return ctx.json(
      {
        message: "File uploaded successfully",
        filename: filename,
      },
      200
    );
  } catch (error) {
    console.error("Upload error:", error);
    return ctx.json({ message: "Error uploading file" }, 500);
  }
});

app.post("/ask-question", async (ctx) => {
  try {
    const body = (await ctx.req.json()) as {
      filename: string;
      question: string;
    };

    if (!body.question || !body.filename) {
      return ctx.json({ message: "No question or filename provided" }, 400);
    }

    const cachedAnswer = await redisCache.get(body.question, body.filename);

    if (cachedAnswer) {
      return ctx.json(
        {
          message: "Question answered from cache",
          question: body.question,
          answer: cachedAnswer,
          cached: true,
        },
        200
      );
    }

    const storage = new Storage(CONFIGS.filePath);

    const fileContent = await storage._get(body.filename);

    let fileText: string;

    if (Buffer.isBuffer(fileContent)) {
      fileText = fileContent.toString("utf-8");
    } else if (typeof fileContent === "string") {
      fileText = fileContent;
    } else {
      fileText = String(fileContent);
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      separators: ["\n\n", "\n", ".", " ", ""],
      chunkOverlap: 150,
    });

    const output = await splitter.createDocuments([fileText]);

    const retriever = BM25Retriever.fromDocuments(output, {
      k: 8,
    });

    const ragChain = createAnthropicRagChain(retriever);

    const result = await ragChain.invoke(body.question);

    await redisCache.set(body.question, body.filename, result);

    return ctx.json(
      {
        message: "Question answered successfully",
        question: body.question,
        answer: result,
        cached: false,
      },
      200
    );
  } catch (error) {
    console.error("Error asking question:", error);
    return ctx.json({ message: "Error asking question" }, 500);
  }
});

app.get("/cache-stats", async (ctx) => {
  try {
    const stats = await redisCache.getStats();
    return ctx.json(
      {
        message: "Cache statistics retrieved successfully",
        stats,
      },
      200
    );
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return ctx.json({ message: "Error getting cache statistics" }, 500);
  }
});

app.delete("/clear-cache/:filename", async (ctx) => {
  try {
    const filename = ctx.req.param("filename");
    await redisCache.clearFileCache(filename);

    return ctx.json(
      {
        message: "Cache cleared successfully for file",
        filename,
      },
      200
    );
  } catch (error) {
    console.error("Error clearing cache:", error);
    return ctx.json({ message: "Error clearing cache" }, 500);
  }
});

export default app;
