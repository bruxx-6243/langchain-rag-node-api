import { QdrantClient } from "@qdrant/js-client-rest";
import * as dotenv from "dotenv";

dotenv.config();

const QDRANT_HOST = process.env.QDRANT_HOST || "localhost";
const QDRANT_PORT = process.env.QDRANT_PORT || "6333";
const QDRANT_COLLECTION_NAME =
  process.env.QDRANT_COLLECTION_NAME || "documents";

const client = new QdrantClient({
  url: `http://${QDRANT_HOST}:${QDRANT_PORT}`,
});

interface Point {
  id: string | number;
  payload?: {
    filename?: string;
    chunk_index?: number;
    page_content?: string;
    [key: string]: unknown;
  };
  vector?: number[];
  score?: number;
}

async function visualizeQdrantData() {
  try {
    console.log("\n🔍 Connecting to Qdrant...");
    console.log(`📍 URL: http://${QDRANT_HOST}:${QDRANT_PORT}`);
    console.log(`📦 Collection: ${QDRANT_COLLECTION_NAME}\n`);

    // Check connection
    await client.getCollections();
    console.log("✅ Connected to Qdrant successfully!\n");

    // Get collection info
    let collectionInfo;
    try {
      collectionInfo = await client.getCollection(QDRANT_COLLECTION_NAME);
    } catch (error) {
      console.log(
        "⚠️  Collection doesn't exist yet. Showing available collections:"
      );
      console.log("─".repeat(60));

      const collections = await client.getCollections();
      if (collections.collections.length === 0) {
        console.log("   No collections found.");
        console.log(
          "\n💡 Tip: Upload a document first to create the collection."
        );
        return;
      }

      collections.collections.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.name}`);
      });

      console.log(
        "\n💡 Tip: Upload a document through your API to create the collection."
      );
      return;
    }

    console.log("📊 Collection Information:");
    console.log("─".repeat(60));
    console.log(`Collection: ${QDRANT_COLLECTION_NAME}`);
    console.log(`Points Count: ${collectionInfo.points_count || 0}`);

    const vectorsConfig = collectionInfo.config?.params?.vectors;
    if (vectorsConfig) {
      if (typeof vectorsConfig === "object" && "size" in vectorsConfig) {
        console.log(`Vector Size: ${vectorsConfig.size}`);
        console.log(`Distance: ${vectorsConfig.distance || "N/A"}`);
      }
    } else {
      console.log(`Vector Config: N/A`);
    }
    console.log("─".repeat(60));
    console.log();

    if (collectionInfo.points_count === 0) {
      console.log("⚠️  Collection is empty. No data to visualize.");
      return;
    }

    // Get all points (limit to first 1000 for performance)
    console.log("📥 Fetching points from collection...");
    const scrollResult = await client.scroll(QDRANT_COLLECTION_NAME, {
      limit: 10000,
      with_payload: true,
      with_vector: false,
    });

    const points = scrollResult.points as Point[];
    console.log(`✅ Fetched ${points.length} points\n`);

    // Analyze data by filename
    const fileStats = new Map<
      string,
      { count: number; chunks: number[]; samples: string[] }
    >();

    points.forEach((point) => {
      const filename = point.payload?.filename as string;
      const chunkIndex = point.payload?.chunk_index as number;
      const pageContent = point.payload?.page_content as string;

      if (filename) {
        if (!fileStats.has(filename)) {
          fileStats.set(filename, { count: 0, chunks: [], samples: [] });
        }
        const stats = fileStats.get(filename)!;
        stats.count++;
        if (chunkIndex !== undefined) {
          stats.chunks.push(chunkIndex);
        }
        if (pageContent && stats.samples.length < 3) {
          const preview = pageContent.substring(0, 100).replaceAll("\n", " ");
          stats.samples.push(preview);
        }
      }
    });

    // Display statistics by file
    console.log("📁 Documents in Collection:");
    console.log("═".repeat(80));
    let totalChunks = 0;

    const sortedFiles = Array.from(fileStats.entries()).sort(
      (a, b) => b[1].count - a[1].count
    );

    sortedFiles.forEach(([filename, stats], index) => {
      totalChunks += stats.count;
      const minChunk = Math.min(...stats.chunks);
      const maxChunk = Math.max(...stats.chunks);
      console.log(`\n${index + 1}. ${filename}`);
      console.log(`   Chunks: ${stats.count}`);
      console.log(`   Chunk Range: ${minChunk} - ${maxChunk}`);
      if (stats.samples.length > 0) {
        console.log(`   Sample Content:`);
        stats.samples.forEach((sample, i) => {
          console.log(`     ${i + 1}. ${sample}...`);
        });
      }
    });

    console.log("\n" + "═".repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   Total Documents: ${fileStats.size}`);
    console.log(`   Total Chunks: ${totalChunks}`);
    console.log(
      `   Average Chunks per Document: ${(totalChunks / fileStats.size).toFixed(
        2
      )}`
    );
    console.log();

    // Display sample points
    console.log("🔍 Sample Points (first 5):");
    console.log("─".repeat(80));
    points.slice(0, 5).forEach((point, index) => {
      console.log(`\nPoint ${index + 1}:`);
      console.log(`  ID: ${point.id}`);
      console.log(`  Filename: ${point.payload?.filename || "N/A"}`);
      console.log(`  Chunk Index: ${point.payload?.chunk_index ?? "N/A"}`);
      const content = (point.payload?.page_content as string) || "";
      const preview = content.substring(0, 150).replaceAll("\n", " ");
      console.log(
        `  Content Preview: ${preview}${content.length > 150 ? "..." : ""}`
      );
    });

    console.log("\n" + "─".repeat(80));
    console.log("\n💡 Tips:");
    console.log(
      "   • Access Qdrant Dashboard: http://localhost:6333/dashboard"
    );
    console.log("   • Use the Qdrant REST API: http://localhost:6333/docs");
    console.log("   • Query specific file: Use getPointsByFilename() method");
    console.log();
  } catch (error) {
    console.error("❌ Error visualizing Qdrant data:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  }
}

// Run the visualization
await visualizeQdrantData();
