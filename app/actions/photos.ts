"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getParticipantSession } from "@/lib/session";
import { softDeletePhoto, listActivePhotos, type GalleryPhoto } from "@/lib/photos";

export type DeletePhotoState = { ok: boolean; error?: string };

/** Public read of active gallery photos — used for live polling (no vote counts). */
export async function getActivePhotosAction(): Promise<GalleryPhoto[]> {
  return listActivePhotos();
}

const photoIdSchema = z.string().uuid();

/**
 * Soft-delete the caller's own photo. Ownership is enforced in the DB query
 * (no row updated unless owner_user_id matches the session). Votes are kept.
 */
export async function deleteOwnPhotoAction(
  photoId: string,
): Promise<DeletePhotoState> {
  const session = await getParticipantSession();
  if (!session) return { ok: false, error: "Please sign in." };

  const parsed = photoIdSchema.safeParse(photoId);
  if (!parsed.success) return { ok: false, error: "Invalid photo." };

  const deleted = await softDeletePhoto(parsed.data, session.userId);
  if (!deleted) {
    return { ok: false, error: "Photo not found, or you don't have permission to delete it." };
  }

  revalidatePath("/");
  return { ok: true };
}
