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

/**
 * Checks whether the configured Qdrant collection exists and displays its metadata.
 *
 * If the collection exists, its information is displayed and returned.
 *
 * @returns The collection info object when the collection exists; `null` if the collection does not exist.
 * @throws Rethrows any non-collection-not-found errors from the Qdrant client.
 */
async function checkCollectionAndShowInfo() {
  try {
    const collectionInfo = await client.getCollection(QDRANT_COLLECTION_NAME);
    displayCollectionInfo(collectionInfo);
    return collectionInfo;
  } catch (error: any) {
    if (error?.status === 404 || error?.message?.includes("doesn't exist")) {
      await showAvailableCollections();
      return null;
    }
    throw error;
  }
}

/**
 * Logs a notice that the configured collection is missing, then lists available collections or shows a tip to create one.
 *
 * If no collections exist, a message and a tip to upload a document are logged. If collections exist, each collection name is listed and a creation tip is shown.
 */
async function showAvailableCollections() {
  console.log(
    "⚠️  Collection doesn't exist yet. Showing available collections:"
  );
  console.log("─".repeat(60));

  const collections = await client.getCollections();
  if (collections.collections.length === 0) {
    console.log("   No collections found.");
    console.log("\n💡 Tip: Upload a document first to create the collection.");
    return;
  }

  collections.collections.forEach((col, index) => {
    console.log(`   ${index + 1}. ${col.name}`);
  });

  console.log(
    "\n💡 Tip: Upload a document through your API to create the collection."
  );
}

/**
 * Prints summary information about the configured Qdrant collection to the console.
 *
 * @param collectionInfo - Raw collection info object returned by the Qdrant client; used to read `points_count` and `config.params.vectors` (including `size` and `distance`) when available.
 */
function displayCollectionInfo(collectionInfo: any) {
  console.log("📊 Collection Information:");
  console.log("─".repeat(60));
  console.log(`Collection: ${QDRANT_COLLECTION_NAME}`);
  console.log(`Points Count: ${collectionInfo.points_count || 0}`);

  const vectorsConfig = collectionInfo.config?.params?.vectors;
  if (
    vectorsConfig &&
    typeof vectorsConfig === "object" &&
    "size" in vectorsConfig
  ) {
    console.log(`Vector Size: ${vectorsConfig.size}`);
    console.log(`Distance: ${vectorsConfig.distance || "N/A"}`);
  } else {
    console.log(`Vector Config: N/A`);
  }
  console.log("─".repeat(60));
  console.log();
}

/**
 * Fetches points for the configured collection, computes per-file statistics, and displays the analysis.
 *
 * @param collectionInfo - Collection metadata object whose `points_count` property is used to determine whether to fetch points
 */
async function fetchAndAnalyzePoints(collectionInfo: any) {
  if (collectionInfo.points_count === 0) {
    console.log("⚠️  Collection is empty. No data to visualize.");
    return;
  }

  console.log("📥 Fetching points from collection...");
  const scrollResult = await client.scroll(QDRANT_COLLECTION_NAME, {
    limit: 10000,
    with_payload: true,
    with_vector: false,
  });

  const points = scrollResult.points as Point[];
  console.log(`✅ Fetched ${points.length} points\n`);

  const fileStats = analyzePoints(points);
  displayAnalysis(fileStats, points);
}

/**
 * Aggregate per-file statistics from an array of points.
 *
 * @param points - The list of points to analyze (each may include payload fields like `filename`, `chunk_index`, and `page_content`).
 * @returns A map keyed by filename. Each entry contains:
 *  - `count`: number of points for that file,
 *  - `chunks`: an array of observed chunk indices,
 *  - `samples`: up to three content previews (each truncated to 100 characters)
 */
function analyzePoints(points: Point[]) {
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
        const preview = pageContent.substring(0, 100).replace(/\n/g, " ");
        stats.samples.push(preview);
      }
    }
  });

  return fileStats;
}

/**
 * Print per-document statistics and an overall summary of the collection to the console.
 *
 * Logs each filename with its chunk count, the minimum and maximum chunk indices, and up to three sample content previews; then logs totals (documents, chunks) and the average chunks per document, and displays a small set of sample points.
 *
 * @param fileStats - Map keyed by filename with values containing:
 *   - `count`: number of chunks for the file
 *   - `chunks`: array of chunk indices present for the file
 *   - `samples`: up to three short text previews extracted from the file's chunks
 * @param points - Array of all points retrieved from the collection; used to render example points after the per-file summary
 */
function displayAnalysis(
  fileStats: Map<
    string,
    { count: number; chunks: number[]; samples: string[] }
  >,
  points: Point[]
) {
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

  displaySamplePoints(points);
}

/**
 * Prints a brief preview of up to the first five points, showing id, filename, chunk index, and a short content snippet.
 *
 * For each sampled point this logs the point number, ID, filename (or `N/A`), chunk index (or `N/A`), and a 150-character preview of `page_content` with newlines removed. After the samples it prints a short tips section with dashboard and API links.
 *
 * @param points - Array of points to sample; only the first five entries are displayed
 */
function displaySamplePoints(points: Point[]) {
  console.log("🔍 Sample Points (first 5):");
  console.log("─".repeat(80));
  points.slice(0, 5).forEach((point, index) => {
    console.log(`\nPoint ${index + 1}:`);
    console.log(`  ID: ${point.id}`);
    console.log(`  Filename: ${point.payload?.filename || "N/A"}`);
    console.log(`  Chunk Index: ${point.payload?.chunk_index ?? "N/A"}`);
    const content = (point.payload?.page_content as string) || "";
    const preview = content.substring(0, 150).replace(/\n/g, " ");
    console.log(
      `  Content Preview: ${preview}${content.length > 150 ? "..." : ""}`
    );
  });

  console.log("\n" + "─".repeat(80));
  console.log("\n💡 Tips:");
  console.log("   • Access Qdrant Dashboard: http://localhost:6333/dashboard");
  console.log("   • Use the Qdrant REST API: http://localhost:6333/docs");
  console.log("   • Query specific file: Use getPointsByFilename() method");
  console.log();
}

/**
 * Connects to Qdrant, displays collection information, and analyzes points for the configured collection.
 *
 * On unexpected errors, logs diagnostic details and exits the process with code 1.
 */
async function visualizeQdrantData() {
  try {
    console.log("\n🔍 Connecting to Qdrant...");
    console.log(`📍 URL: http://${QDRANT_HOST}:${QDRANT_PORT}`);
    console.log(`📦 Collection: ${QDRANT_COLLECTION_NAME}\n`);
    console.log("✅ Connected to Qdrant successfully!\n");

    const collectionInfo = await checkCollectionAndShowInfo();
    if (collectionInfo) {
      await fetchAndAnalyzePoints(collectionInfo);
    }
  } catch (error) {
    console.error("❌ Error visualizing Qdrant data:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  }
}

(async () => {
  await visualizeQdrantData();
})();