"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getParticipantSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getPhotoById } from "@/lib/photos";
import { createVote, deleteVote } from "@/lib/votes";

export type VoteState = { ok: boolean; error?: string };

const photoIdSchema = z.string().uuid();

/** Vote for a photo. Participant-only, gated by votingOpen. Idempotent. */
export async function voteAction(photoId: string): Promise<VoteState> {
  const session = await getParticipantSession();
  if (!session) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };

  const parsed = photoIdSchema.safeParse(photoId);
  if (!parsed.success) return { ok: false, error: "รูปภาพไม่ถูกต้อง" };

  const settings = await getSettings();
  if (!settings.votingOpen) return { ok: false, error: "ขณะนี้ปิดการโหวต" };

  const photo = await getPhotoById(parsed.data);
  if (!photo || photo.is_deleted) return { ok: false, error: "ไม่พบรูปภาพนี้" };

  await createVote(session.userId, parsed.data); // duplicate is a no-op
  revalidatePath("/");
  return { ok: true };
}

/**
 * Unvote a photo. Participant-only, gated by votingOpen. Blocked when the
 * caller owns the photo (owner auto-vote is permanent).
 */
export async function unvoteAction(photoId: string): Promise<VoteState> {
  const session = await getParticipantSession();
  if (!session) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };

  const parsed = photoIdSchema.safeParse(photoId);
  if (!parsed.success) return { ok: false, error: "รูปภาพไม่ถูกต้อง" };

  const settings = await getSettings();
  if (!settings.votingOpen) return { ok: false, error: "ขณะนี้ปิดการโหวต" };

  const photo = await getPhotoById(parsed.data);
  if (!photo) return { ok: false, error: "ไม่พบรูปภาพนี้" };

  if (photo.owner_user_id === session.userId) {
    return { ok: false, error: "ไม่สามารถยกเลิกโหวตรูปของตัวเองได้" };
  }

  await deleteVote(session.userId, parsed.data);
  revalidatePath("/");
  return { ok: true };
}
