import { CONFIGS } from "@/constants";
import { ChatAnthropic } from "@langchain/anthropic";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { BaseRetriever } from "@langchain/core/retrievers";
import {
  RunnableLambda,
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";

class AnthropicRagChain {
  private readonly model: ChatAnthropic;
  private readonly chain: RunnableSequence;

  constructor(retriever: BaseRetriever) {
    this.model = new ChatAnthropic({
      model: CONFIGS.anthropic.model,
      apiKey: CONFIGS.anthropic.apiKey,
    });

    const formatDocs = RunnableLambda.from(async (docs: any[]) =>
      docs.map((d) => d.pageContent).join("\n\n")
    );

    this.chain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocs),
        question: new RunnablePassthrough(),
      },
      this.prompt,
      this.model,
      new StringOutputParser(),
    ]);
  }

  async invoke(question: string): Promise<string> {
    return await this.chain.invoke(question);
  }

  async stream(question: string) {
    return await this.chain.stream(question);
  }

  private readonly prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a helpful assistant. Answer the user's question using only the provided context. If the answer isn't in the context, say you don't have the information. If the question is not related to the context, say you don't have the information.\n\nContext:\n{context}",
    ],
    ["human", "{question}"],
  ]);
}

export function createAnthropicRagChain(retriever: BaseRetriever) {
  return new AnthropicRagChain(retriever);
}
