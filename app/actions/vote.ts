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
  if (!session) return { ok: false, error: "Please sign in." };

  const parsed = photoIdSchema.safeParse(photoId);
  if (!parsed.success) return { ok: false, error: "Invalid photo." };

  const settings = await getSettings();
  if (!settings.votingOpen) return { ok: false, error: "Voting is closed right now." };

  const photo = await getPhotoById(parsed.data);
  if (!photo || photo.is_deleted) return { ok: false, error: "This photo wasn't found." };

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
  if (!session) return { ok: false, error: "Please sign in." };

  const parsed = photoIdSchema.safeParse(photoId);
  if (!parsed.success) return { ok: false, error: "Invalid photo." };

  const settings = await getSettings();
  if (!settings.votingOpen) return { ok: false, error: "Voting is closed right now." };

  const photo = await getPhotoById(parsed.data);
  if (!photo) return { ok: false, error: "This photo wasn't found." };

  if (photo.owner_user_id === session.userId) {
    return { ok: false, error: "You can't remove the vote on your own photo." };
  }

  await deleteVote(session.userId, parsed.data);
  revalidatePath("/");
  return { ok: true };
}
