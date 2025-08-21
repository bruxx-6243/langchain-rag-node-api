import { Hono } from "hono";
import { Storage } from "@/lib/storage";
import { CONFIGS } from "@/constants";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { createAnthropicRagChain } from "@/anthropic";

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

    return ctx.json(
      {
        message: "Question answered successfully",
        question: body.question,
        answer: result,
      },
      200
    );
  } catch (error) {
    console.error("Error asking question:", error);
    return ctx.json({ message: "Error asking question" }, 500);
  }
});

export default app;
