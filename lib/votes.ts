import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

const UNIQUE_VIOLATION = "23505"; // Postgres duplicate key

/**
 * Create a vote. Idempotent against unique(user_id, photo_id): a duplicate is
 * silently ignored (returns false), any new vote returns true.
 */
export async function createVote(
  userId: string,
  photoId: string,
): Promise<boolean> {
  const db = supabaseAdmin();
  const { error } = await db
    .from("votes")
    .insert({ user_id: userId, photo_id: photoId });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return false; // already voted
    throw error;
  }
  return true;
}

/** Remove a vote. No-op if it does not exist. */
export async function deleteVote(
  userId: string,
  photoId: string,
): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db
    .from("votes")
    .delete()
    .eq("user_id", userId)
    .eq("photo_id", photoId);
  if (error) throw error;
}

/** Photo ids this user has voted for — drives gallery voted-state. */
export async function getVotedPhotoIds(userId: string): Promise<string[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("votes")
    .select("photo_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as { photo_id: string }[]).map((r) => r.photo_id);
}

/** photoId → vote count map. Admin/reveal only. */
export async function countVotesByPhoto(): Promise<Record<string, number>> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("votes").select("photo_id");
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const r of data as { photo_id: string }[]) {
    counts[r.photo_id] = (counts[r.photo_id] ?? 0) + 1;
  }
  return counts;
}
