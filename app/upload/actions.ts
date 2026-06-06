"use server";

import { revalidatePath } from "next/cache";
import { getParticipantSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { uploadProcessedPhoto, deletePhotoObject } from "@/lib/storage";
import { createPhoto, countActivePhotosByOwner } from "@/lib/photos";
import { createVote } from "@/lib/votes";
import { processUploadImage } from "@/lib/image";

export type UploadState = { ok: boolean; error?: string };

const MAX_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_PHOTOS_PER_USER = 5;
const MAX_CAPTION_LEN = 300;

// Accepted upload extensions. HEIC/HEIF are transcoded server-side; the rest
// go straight to sharp. The actual content is validated by decoding, so we
// gate on extension here and let the image pipeline reject non-images.
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const HEIC_EXT = new Set(["heic", "heif"]);

function extFromName(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/**
 * Upload one photo with a required caption. Participant-only, gated by
 * uploadOpen and a per-user cap. Accepts large phone photos incl. HEIC; the
 * image is normalized to display + thumbnail WebP before storage. Auto-creates
 * the owner's vote. Returns { ok } — the UI handles navigation.
 */
export async function uploadPhotoAction(formData: FormData): Promise<UploadState> {
  const session = await getParticipantSession();
  if (!session) return { ok: false, error: "Please sign in before uploading." };

  const settings = await getSettings();
  if (!settings.uploadOpen) return { ok: false, error: "Uploads are closed right now." };

  // Per-user cap.
  const existing = await countActivePhotosByOwner(session.userId);
  if (existing >= MAX_PHOTOS_PER_USER) {
    return { ok: false, error: `You can upload up to ${MAX_PHOTOS_PER_USER} photos.` };
  }

  // Exactly one file.
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length !== 1) return { ok: false, error: "Please select one photo." };
  const file = files[0];

  // Caption required.
  const caption = String(formData.get("caption") ?? "").trim();
  if (!caption) return { ok: false, error: "Please add a caption." };
  if (caption.length > MAX_CAPTION_LEN) {
    return { ok: false, error: `Caption must be ${MAX_CAPTION_LEN} characters or fewer.` };
  }

  // Size.
  if (file.size > MAX_BYTES) return { ok: false, error: "File is larger than 20MB." };

  // Extension allowlist (content re-validated by the decoder below).
  const ext = extFromName(file.name);
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: "Only jpg, png, webp, and heic files are supported." };
  }

  // Normalize to display + thumbnail WebP. A decode failure means the bytes
  // weren't a real/supported image.
  let processed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    processed = await processUploadImage(buffer, HEIC_EXT.has(ext));
  } catch (err) {
    console.error("processUploadImage failed:", err);
    return { ok: false, error: "That image is invalid or unsupported. Please try another photo." };
  }

  // Upload both versions.
  let uploaded;
  try {
    uploaded = await uploadProcessedPhoto(session.userId, processed.full, processed.thumb);
  } catch (err) {
    console.error("uploadProcessedPhoto failed:", err);
    return { ok: false, error: "Couldn't upload the photo. Please try again." };
  }

  // Create the row; on failure clean up the orphaned objects.
  let photo;
  try {
    photo = await createPhoto({
      ownerUserId: session.userId,
      imageUrl: uploaded.imageUrl,
      imagePath: uploaded.imagePath,
      thumbnailUrl: uploaded.thumbnailUrl,
      caption,
    });
  } catch (err) {
    console.error("createPhoto failed:", err);
    await deletePhotoObject(uploaded.imagePath, uploaded.thumbnailPath).catch(() => {});
    return { ok: false, error: "Couldn't save your photo. Please try again." };
  }

  // Auto-vote the owner's own photo (idempotent).
  const voted = await createVote(session.userId, photo.id).catch(() => false);
  if (!voted) console.warn(`auto-vote not created for photo ${photo.id}`);

  revalidatePath("/");
  return { ok: true };
}
