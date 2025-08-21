#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, "uploads");
const MAX_SIZE_GB = 2; // 2GB limit
const MAX_SIZE_BYTES = MAX_SIZE_GB * 1024 * 1024 * 1024;

/**
 * Get directory size recursively
 */
function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }

  return totalSize;
}

/**
 * Get file info for sorting (oldest first)
 */
function getFileInfo(dirPath) {
  const files = [];

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isFile()) {
        files.push({
          name: item,
          path: itemPath,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }

  return files;
}

/**
 * Cleanup old files to free up space
 */
function cleanupOldFiles(dirPath, targetSize) {
  const files = getFileInfo(dirPath);

  // Sort by creation time (oldest first)
  files.sort((a, b) => a.created.getTime() - b.created.getTime());

  let freedSpace = 0;
  const deletedFiles = [];

  for (const file of files) {
    if (freedSpace >= targetSize) break;

    try {
      fs.unlinkSync(file.path);
      freedSpace += file.size;
      deletedFiles.push(file.name);
      console.log(
        `Deleted: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
      );
    } catch (error) {
      console.error(`Error deleting ${file.name}:`, error.message);
    }
  }

  return { freedSpace, deletedFiles };
}

/**
 * Main cleanup function
 */
function cleanupUploads() {
  console.log("Starting uploads cleanup...");

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log("Uploads directory does not exist, creating...");
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    return;
  }

  const currentSize = getDirectorySize(UPLOADS_DIR);
  const currentSizeGB = (currentSize / 1024 / 1024 / 1024).toFixed(2);

  console.log(`Current uploads size: ${currentSizeGB} GB`);

  if (currentSize <= MAX_SIZE_BYTES) {
    console.log("Storage is within limits, no cleanup needed.");
    return;
  }

  const excessSize = currentSize - MAX_SIZE_BYTES;
  console.log(
    `Storage exceeds limit by ${(excessSize / 1024 / 1024 / 1024).toFixed(
      2
    )} GB`
  );

  const { freedSpace, deletedFiles } = cleanupOldFiles(UPLOADS_DIR, excessSize);

  console.log(`Cleanup completed:`);
  console.log(`- Files deleted: ${deletedFiles.length}`);
  console.log(
    `- Space freed: ${(freedSpace / 1024 / 1024 / 1024).toFixed(2)} GB`
  );

  const newSize = getDirectorySize(UPLOADS_DIR);
  const newSizeGB = (newSize / 1024 / 1024 / 1024).toFixed(2);
  console.log(`New uploads size: ${newSizeGB} GB`);
}

// Run cleanup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupUploads();
}

export { cleanupUploads, getDirectorySize, getFileInfo };
