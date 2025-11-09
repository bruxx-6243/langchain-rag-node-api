import { createAnthropicRagChain } from "@/anthropic";
import { CONFIGS } from "@/constants";
import { redisCache } from "@/lib/redis";
import { Storage } from "@/lib/storage";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { Hono } from "hono";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { HTTPException } from "hono/http-exception";

const app = new Hono();

app.post("/upload-file", async (ctx) => {
  try {
    const formData = await ctx.req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new HTTPException(400, { message: "No file uploaded" });
    }

    if (!file.name.endsWith(".txt")) {
      throw new HTTPException(400, { message: "File must be a .txt file" });
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
    throw new HTTPException(500, { message: "Error uploading file" });
  }
});

app.post("/ask-question", async (ctx) => {
  try {
    const body = (await ctx.req.json()) as {
      filename: string;
      question: string;
    };

    if (!body.question || !body.filename) {
      throw new HTTPException(400, {
        message: "No question or filename provided",
      });
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

    if (!fileContent) {
      throw new HTTPException(404, { message: "File not found" });
    }

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
    // return ctx.json({ message: "Error asking question" }, 500);
    throw new HTTPException(500, { message: "Error asking question" });
  }
});

app.get("/cache-stats", async (ctx) => {
  try {
    const stats = await redisCache.getStats();

    if (!stats) {
      throw new HTTPException(500, {
        message: "Error getting cache statistics",
      });
    }

    return ctx.json(
      {
        message: "Cache statistics retrieved successfully",
        stats,
      },
      200
    );
  } catch (error) {
    console.error("Error getting cache stats:", error);
    throw new HTTPException(500, { message: "Error getting cache statistics" });
  }
});

app.delete("/clear-cache/:filename", async (ctx) => {
  try {
    const filename = ctx.req.param("filename");
    await redisCache.clearFileCache(filename);

    if (!filename) {
      throw new HTTPException(400, { message: "No filename provided" });
    }

    return ctx.json(
      {
        message: "Cache cleared successfully for file",
        filename,
      },
      200
    );
  } catch (error) {
    console.error("Error clearing cache:", error);
    throw new HTTPException(500, { message: "Error clearing cache" });
  }
});

export default app;
