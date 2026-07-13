import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidArchivePath, type CvArchiveStore } from "./cvArchive";

/** Private Storage bucket holding the delivered files (see supabase/schema.sql). */
const BUCKET = "cvs";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * CvArchiveStore backed by Supabase Storage — the durable archive on a deploy,
 * same layout as the local file store (`<folder>/<file>.docx`). Reached only
 * with the service role key; the bucket is private (no public URLs).
 */
export class SupabaseCvArchiveStore implements CvArchiveStore {
  constructor(private readonly client: SupabaseClient) {}

  private validate(archivePath: string): void {
    if (!isValidArchivePath(archivePath)) {
      throw new Error(`Invalid archive path: ${JSON.stringify(archivePath)}`);
    }
  }

  async save(archivePath: string, bytes: Uint8Array): Promise<void> {
    this.validate(archivePath);
    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(archivePath, bytes, { contentType: DOCX_MIME, upsert: true });
    if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  async read(archivePath: string): Promise<Uint8Array | null> {
    this.validate(archivePath);
    const { data, error } = await this.client.storage.from(BUCKET).download(archivePath);
    if (error) {
      const status = (error as { status?: number }).status;
      if (status === 404 || /not.?found/i.test(error.message)) return null;
      throw new Error(`Supabase Storage download failed: ${error.message}`);
    }
    return new Uint8Array(await data.arrayBuffer());
  }
}
