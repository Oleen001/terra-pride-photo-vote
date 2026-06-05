import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export type UploadedObject = { publicUrl: string; path: string };

export type UploadedPair = {
  imageUrl: string;
  imagePath: string;
  thumbnailUrl: string;
  thumbnailPath: string;
};

/**
 * Upload the processed display + thumbnail WebP buffers under one shared uuid
 * so they're easy to relate and clean up. Both are stored as `.webp`.
 */
export async function uploadProcessedPhoto(
  userId: string,
  full: Buffer,
  thumb: Buffer,
): Promise<UploadedPair> {
  const db = supabaseAdmin();
  const id = randomUUID();
  const imagePath = `${userId}/${id}.webp`;
  const thumbnailPath = `${userId}/${id}_thumb.webp`;

  const up = (path: string, body: Buffer) =>
    db.storage
      .from(env.photosBucket)
      .upload(path, body, { contentType: "image/webp", upsert: false });

  const [fullRes, thumbRes] = await Promise.all([
    up(imagePath, full),
    up(thumbnailPath, thumb),
  ]);
  if (fullRes.error) throw fullRes.error;
  if (thumbRes.error) {
    // Don't orphan the full image if the thumb failed.
    await db.storage.from(env.photosBucket).remove([imagePath]).catch(() => {});
    throw thumbRes.error;
  }

  const pub = (path: string) =>
    db.storage.from(env.photosBucket).getPublicUrl(path).data.publicUrl;

  return {
    imageUrl: pub(imagePath),
    imagePath,
    thumbnailUrl: pub(thumbnailPath),
    thumbnailPath,
  };
}

/**
 * Upload a photo object to the photos bucket under a unique per-user path.
 * `body` is the raw image bytes; `ext` is the validated lowercase extension
 * (no dot). Returns the public URL + storage path (store both on the row).
 */
export async function uploadPhotoObject(
  userId: string,
  body: ArrayBuffer | Buffer | Uint8Array,
  ext: string,
  contentType: string,
): Promise<UploadedObject> {
  const db = supabaseAdmin();
  const path = `${userId}/${randomUUID()}.${ext}`;

  const { error } = await db.storage
    .from(env.photosBucket)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;

  const { data } = db.storage.from(env.photosBucket).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

/** Remove one or more photo objects by storage path. Throws on error. */
export async function deletePhotoObject(...paths: string[]): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.storage.from(env.photosBucket).remove(paths);
  if (error) throw error;
}
