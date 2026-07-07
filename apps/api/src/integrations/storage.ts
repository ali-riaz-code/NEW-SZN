// Object storage behind an S3-shaped interface (Phase 11).
//
// PDF reports are written here. Locally we use the disk; production will swap in
// real S3. That swap is a ONE-FILE change: implement `ObjectStore` with the AWS
// SDK and export it as `storage` instead of the local instance below. Nothing
// else in the codebase touches the filesystem or knows the backend.
//
// Downloads are always served through the authed API (GET /api/reports/:id/download)
// so client data never leaks via a public URL — `objectUrl` is only an internal
// reference, not a browser link.

import { promises as fs } from 'fs'
import path from 'path'

export interface StoredObject {
  key: string
  url: string
}

export interface ObjectStore {
  putObject(key: string, body: Buffer, contentType?: string): Promise<StoredObject>
  getObject(key: string): Promise<Buffer>
  objectUrl(key: string): string
}

class LocalObjectStore implements ObjectStore {
  constructor(private readonly baseDir: string) {}

  private full(key: string): string {
    // Prevent path traversal — keys are app-generated, but be defensive.
    const safe = path.normalize(key).replace(/^(\.\.[/\\])+/, '')
    return path.join(this.baseDir, safe)
  }

  async putObject(key: string, body: Buffer): Promise<StoredObject> {
    const p = this.full(key)
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, body)
    return { key, url: this.objectUrl(key) }
  }

  async getObject(key: string): Promise<Buffer> {
    return fs.readFile(this.full(key))
  }

  objectUrl(key: string): string {
    // Internal reference only (not a browser-facing link).
    return `local://${key}`
  }
}

const BASE_DIR = process.env.REPORT_STORAGE_DIR
  ? path.resolve(process.env.REPORT_STORAGE_DIR)
  : path.resolve(process.cwd(), 'storage')

export const storage: ObjectStore = new LocalObjectStore(BASE_DIR)
