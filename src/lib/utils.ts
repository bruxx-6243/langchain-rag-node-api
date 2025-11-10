import { createHash } from "node:crypto";

export const hashQuestion = (q: string) =>
  createHash("sha256").update(q).digest("hex").slice(0, 12);

export const answerCacheKey = (filename: string, question: string) =>
  `rag:${filename}:${hashQuestion(question)}`;

export const chunkCacheKey = (filename: string) => `chunks:${filename}`;

export const convertBufferToString = (content: Buffer | string): string => {
  if (Buffer.isBuffer(content)) return content.toString("utf-8");
  return typeof content === "string" ? content : String(content);
};
