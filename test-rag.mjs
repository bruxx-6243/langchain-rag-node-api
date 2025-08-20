import "dotenv/config";
import { readFile } from "fs/promises";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { createAnthropicRagChain } from "./src/anthropic/index.js";

async function testRagChain() {
  try {
    // Check if API key is set
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("❌ ANTHROPIC_API_KEY not set in environment variables");
      console.log("Please run: npm run setup");
      return;
    }

    console.log("✅ Testing RAG chain...");

    // Read a sample file from uploads
    const files = await readFile(
      "uploads/file-1755697359506-614993714-cashlock_idea.txt",
      "utf-8"
    );

    console.log("✅ File read successfully");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      separators: ["\n\n", "\n", ".", " ", ""],
      chunkOverlap: 150,
    });

    const output = await splitter.createDocuments([files]);
    console.log(`✅ Split into ${output.length} chunks`);

    const retriever = BM25Retriever.fromDocuments(output, {
      k: 8,
    });

    const ragChain = createAnthropicRagChain(retriever);
    console.log("✅ RAG chain created successfully");

    const question = "What is the origin of CashLock?";
    console.log(`🤔 Asking: ${question}`);

    const result = await ragChain.invoke(question);
    console.log("✅ Answer received:");
    console.log(result);
  } catch (error) {
    console.error("❌ Error testing RAG chain:", error);
  }
}

testRagChain();
