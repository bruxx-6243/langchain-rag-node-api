import { promises as fs } from "fs";
import path from "path";

export class Storage {
  constructor(private readonly storagePath: string) {}

  async _store(file: File) {
    const storagePath = path.join(process.cwd(), this.storagePath);

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `file-${uniqueSuffix}-${file.name}`;
    const filePath = path.join(storagePath, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    return {
      filename,
      originalName: file.name,
      size: file.size,
    };
  }

  async _get(filename: string) {
    const storagePath = path.join(process.cwd(), this.storagePath);
    const filePath = path.join(storagePath, filename);
    const file = await fs.readFile(filePath);

    return file;
  }
}
