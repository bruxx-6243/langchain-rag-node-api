import { createHash } from "node:crypto";

export function hashQuestion(q: string): string {
  return createHash("sha256").update(q).digest("hex").slice(0, 12);
}

export function answerCacheKey(filename: string, question: string) {
  return `rag:${filename}:${hashQuestion(question)}`;
}

export function chunkCacheKey(filename: string): string {
  return `chunks:${filename}`;
}

export function convertBufferToString(content: Buffer | string): string {
  if (Buffer.isBuffer(content)) return content.toString("utf-8");

  return typeof content === "string" ? content : String(content);
}
