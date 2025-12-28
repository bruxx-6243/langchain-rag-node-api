import { CONFIGS } from "@/constants";
import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { embeddingService } from "@/lib/embeddings";
import { qdrantService } from "@/lib/qdrant";

interface ScoredDocument {
  document: Document;
  score: number;
}

export class HybridRetriever extends BaseRetriever {
  lc_namespace = ["langchain", "retrievers", "hybrid"];

  private readonly bm25Retriever: BM25Retriever;
  private readonly filename: string;
  private readonly topK: number;

  constructor(docs: Document[], filename: string, topK?: number) {
    super();
    this.bm25Retriever = BM25Retriever.fromDocuments(docs, {
      k: topK || CONFIGS.hybridSearch.topK,
    });
    this.filename = filename;
    this.topK = topK || CONFIGS.hybridSearch.topK;
  }

  async _getRelevantDocuments(
    query: string,
    runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    const bm25Results = await this.getBM25Results(query);

    const vectorResults = await this.getVectorResults(query);

    const combined = this.combineResults(bm25Results, vectorResults);

    combined.sort((a, b) => b.score - a.score);

    return combined.slice(0, this.topK).map((item) => item.document);
  }

  private async getBM25Results(query: string): Promise<ScoredDocument[]> {
    try {
      const docs = await this.bm25Retriever.invoke(query);

      return docs.map((doc) => ({
        document: doc,
        score: 1,
      }));
    } catch (error) {
      console.error("Error in BM25 search:", error);
      return [];
    }
  }

  private async getVectorResults(query: string): Promise<ScoredDocument[]> {
    try {
      const queryVector = await embeddingService.embedQuery(query);

      const filter = {
        must: [
          {
            key: "filename",
            match: {
              value: this.filename,
            },
          },
        ],
      } as const;

      const results = await qdrantService.search(
        queryVector,
        this.topK,
        filter
      );

      return results.map((point) => {
        const payload = point.payload as Record<string, unknown>;
        return {
          document: new Document({
            pageContent: (payload.page_content as string) || "",
            metadata: {
              filename: payload.filename as string,
              chunk_index: payload.chunk_index as number,
              score: point.score,
            },
          }),
          score: point.score || 0,
        };
      });
    } catch (error) {
      console.error("Error in vector search:", error);
      return [];
    }
  }

  private combineResults(
    bm25Results: ScoredDocument[],
    vectorResults: ScoredDocument[]
  ): ScoredDocument[] {
    const bm25Weight = CONFIGS.hybridSearch.bm25Weight;
    const vectorWeight = CONFIGS.hybridSearch.vectorWeight;

    const normalizeScores = (results: ScoredDocument[]): ScoredDocument[] => {
      if (results.length === 0) return [];
      const maxScore = Math.max(...results.map((r) => r.score));
      if (maxScore === 0) return results;
      return results.map((r) => ({
        ...r,
        score: r.score / maxScore,
      }));
    };

    const normalizedBM25 = normalizeScores(bm25Results);
    const normalizedVector = normalizeScores(vectorResults);

    const docMap = new Map<string, ScoredDocument>();

    for (const item of normalizedBM25) {
      const key = item.document.pageContent;
      docMap.set(key, {
        document: item.document,
        score: item.score * bm25Weight,
      });
    }

    for (const item of normalizedVector) {
      const key = item.document.pageContent;
      const existing = docMap.get(key);
      if (existing) {
        existing.score += item.score * vectorWeight;
      } else {
        docMap.set(key, {
          document: item.document,
          score: item.score * vectorWeight,
        });
      }
    }

    return Array.from(docMap.values());
  }
}
