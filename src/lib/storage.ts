import { promises as fs } from "fs";
import path from "path";

export class Storage {
  private readonly storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
  }

  async save(
    file: File
  ): Promise<{ filename: string; originalName: string; size: number }> {
    return this._store(file);
  }

  async load(filename: string): Promise<Buffer | null> {
    try {
      return await this._get(filename);
    } catch {
      return null;
    }
  }

  private async _store(file: File) {
    const storagePath = path.join(process.cwd(), this.storagePath);
    await fs.mkdir(storagePath, { recursive: true });

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

  private async _get(filename: string) {
    const storagePath = path.join(process.cwd(), this.storagePath);
    const filePath = path.join(storagePath, filename);
    return await fs.readFile(filePath);
  }
}
