import * as fs from "fs";
import * as path from "path";
import { CONFIGS } from "./src/constants.js";

/**
 * Uploads a sample file from the configured uploads directory to the local upload API and logs progress and results.
 *
 * Prefers a file whose name contains `cashlock_idea.txt`; if none exists, uses the first file in the directory.
 * Logs file selection and size, sends the file to http://localhost:8080/api/upload, logs the API response (including returned filename),
 * waits briefly for server-side processing, and logs a final readiness message. On error, logs the failure and a hint to start the API.
 */
async function testUpload() {
  try {
    // Read one of the existing files
    const files = fs.readdirSync(CONFIGS.filePath);
    const testFile = files.find(f => f.includes('cashlock_idea.txt')) || files[0];

    if (!testFile) {
      console.log("❌ No files found in uploads directory");
      return;
    }

    const filePath = path.join(CONFIGS.filePath, testFile);
    const fileContent = fs.readFileSync(filePath);

    console.log(`📁 Testing upload with file: ${testFile}`);
    console.log(`📊 File size: ${fileContent.length} bytes`);

    // Create form data for upload
    const formData = new FormData();
    formData.append('file', new Blob([fileContent]), testFile);

    // Upload to API
    const response = await fetch('http://localhost:8080/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.log(`❌ Upload failed: ${response.status} ${response.statusText}`);
      const error = await response.text();
      console.log(`Error: ${error}`);
      return;
    }

    const result = await response.json();
    console.log("✅ Upload successful!");
    console.log(`📄 Filename: ${result.filename}`);

    // Wait a moment for processing
    console.log("⏳ Waiting for vector processing...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("🎉 Ready to visualize! Run: pnpm visualize");

  } catch (error) {
    console.error("❌ Test upload failed:", error);
    console.log("\n💡 Make sure the API is running: pnpm dev");
  }
}

// Run the test
testUpload().catch(console.error);