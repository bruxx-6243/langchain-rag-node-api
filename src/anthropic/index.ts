import { ChatAnthropic } from "@langchain/anthropic";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { BaseRetriever } from "@langchain/core/retrievers";
import {
  RunnableLambda,
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";

export function createAnthropicRagChain(retriever: BaseRetriever) {
  const model = new ChatAnthropic({
    model: "claude-3-5-sonnet-20240620",
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a helpful assistant. Answer the user's question using only the provided context. If the answer isn't in the context, say you don't have the information. If the question is not related to the context, say you don't have the information.\n\nContext:\n{context}",
    ],
    ["human", "{question}"],
  ]);

  const formatDocs = RunnableLambda.from(async (docs: any[]) =>
    docs.map((d) => d.pageContent).join("\n\n")
  );

  return RunnableSequence.from([
    {
      context: retriever.pipe(formatDocs),
      question: new RunnablePassthrough(),
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);
}
