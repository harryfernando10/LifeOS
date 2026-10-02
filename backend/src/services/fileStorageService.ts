import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getPrivateStorageRoot } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { assertSafeRelativeStorageKey } from "../utils/fileValidation.js";

/**
 * Private local filesystem storage for vault files.
 * Layout: {root}/{userId}/{documentId}/{versionId}
 * Never expose absolute paths to API clients.
 */
export class FileStorageService {
  constructor(private readonly rootPath: string) {}

  getRootPath(): string {
    return this.rootPath;
  }

  buildStorageKey(
    userId: string,
    documentId: string,
    versionId: string,
  ): string {
    return `${userId}/${documentId}/${versionId}`;
  }

  resolveAbsolutePath(storageKey: string): string {
    assertSafeRelativeStorageKey(storageKey);
    const absolute = path.resolve(this.rootPath, ...storageKey.split("/"));
    const rootResolved = path.resolve(this.rootPath);
    const relative = path.relative(rootResolved, absolute);

    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      relative.includes(`..${path.sep}`)
    ) {
      throw new AppError(400, "Invalid storage path.", "VALIDATION_ERROR");
    }

    return absolute;
  }

  async ensureRoot(): Promise<void> {
    await fs.mkdir(this.rootPath, { recursive: true });
  }

  async storeFile(
    storageKey: string,
    contents: Buffer,
  ): Promise<{ sizeBytes: number; checksumSha256: string }> {
    const absolute = this.resolveAbsolutePath(storageKey);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, contents, { flag: "wx" });

    return {
      sizeBytes: contents.byteLength,
      checksumSha256: createHash("sha256").update(contents).digest("hex"),
    };
  }

  async readFile(storageKey: string): Promise<Buffer> {
    const absolute = this.resolveAbsolutePath(storageKey);
    try {
      return await fs.readFile(absolute);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "ENOENT"
      ) {
        throw new AppError(404, "File not found.", "NOT_FOUND");
      }
      throw error;
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    const absolute = this.resolveAbsolutePath(storageKey);
    try {
      await fs.unlink(absolute);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "ENOENT"
      ) {
        return;
      }
      throw error;
    }
  }

  async deleteDocumentDirectory(
    userId: string,
    documentId: string,
  ): Promise<void> {
    const storageKey = `${userId}/${documentId}`;
    const absolute = this.resolveAbsolutePath(storageKey);
    await fs.rm(absolute, { recursive: true, force: true });
  }

  /** Test helper: generate ids without relying on Prisma defaults. */
  createIds(): { documentId: string; versionId: string } {
    return {
      documentId: randomUUID(),
      versionId: randomUUID(),
    };
  }
}

let singleton: FileStorageService | null = null;

export function getFileStorageService(): FileStorageService {
  if (!singleton) {
    const root = path.resolve(getPrivateStorageRoot());
    singleton = new FileStorageService(root);
  }
  return singleton;
}

/** Used by tests to isolate storage under a temp directory. */
export function setFileStorageServiceForTests(
  service: FileStorageService | null,
): void {
  singleton = service;
}
