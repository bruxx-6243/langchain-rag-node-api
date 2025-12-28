import { CONFIGS } from "@/constants";
import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { embeddingService } from "@/lib/embeddings";
import { qdrantService } from "@/lib/qdrant";

export type RetrieverMode = "semantic" | "keyword" | "hybrid";

interface ScoredDocument {
  document: Document;
  score: number;
}

export class HybridRetriever extends BaseRetriever {
  lc_namespace = ["langchain", "retrievers", "hybrid"];

  private readonly bm25Retriever: BM25Retriever;
  private readonly filename: string;
  private readonly topK: number;
  private readonly mode: RetrieverMode;

  private sanitizeQueryForBM25(query: string): string {
    // Escape regex special characters that can cause invalid regex patterns
    // Using replace() with regex /g flag instead of replaceAll() for regex pattern matching
    return query.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  }

  constructor(
    docs: Document[],
    filename: string,
    topK?: number,
    mode: RetrieverMode = "hybrid"
  ) {
    super();
    this.bm25Retriever = BM25Retriever.fromDocuments(docs, {
      k: topK || CONFIGS.hybridSearch.topK,
    });
    this.filename = filename;
    this.topK = topK || CONFIGS.hybridSearch.topK;
    this.mode = mode;
  }

  async _getRelevantDocuments(
    query: string,
    runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    let semanticResults: ScoredDocument[] = [];
    let keywordResults: ScoredDocument[] = [];

    if (this.mode === "semantic" || this.mode === "hybrid") {
      semanticResults = await this.getVectorResults(query);
    }

    if (this.mode === "keyword" || this.mode === "hybrid") {
      keywordResults = await this.getBM25Results(query);
    }

    if (this.mode === "semantic") {
      const sortedSemantic = [...semanticResults].sort(
        (a, b) => b.score - a.score
      );
      return sortedSemantic.slice(0, this.topK).map((item) => item.document);
    }

    if (this.mode === "keyword") {
      const sortedKeyword = [...keywordResults].sort(
        (a, b) => b.score - a.score
      );
      return sortedKeyword.slice(0, this.topK).map((item) => item.document);
    }

    const combined = this.combineResults(keywordResults, semanticResults);
    const sortedCombined = [...combined].sort((a, b) => b.score - a.score);

    return sortedCombined.slice(0, this.topK).map((item) => item.document);
  }

  private async getBM25Results(query: string): Promise<ScoredDocument[]> {
    try {
      // Sanitize the query to escape regex special characters that can cause BM25 to fail
      const sanitizedQuery = this.sanitizeQueryForBM25(query);
      const docs = await this.bm25Retriever.invoke(sanitizedQuery);

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
