import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PhotoRow = {
  id: string;
  owner_user_id: string;
  image_url: string;
  image_path: string;
  thumbnail_url: string | null;
  caption: string;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Gallery card shape. NOTE: never carries a vote count, and never the raw
 * owner email — only a derived display name. ownerUserId is kept for owner checks.
 */
export type GalleryPhoto = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string;
  ownerUserId: string;
  uploaderName: string;
  createdAt: string;
};

/** Admin list row — includes deleted flag + vote count + raw owner email. */
export type AdminPhoto = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string;
  ownerUserId: string;
  ownerEmail: string;
  createdAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
  voteCount: number;
};

/** Reveal row — Top N with vote count. */
export type RankedPhoto = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string;
  ownerUserId: string;
  ownerEmail: string;
  createdAt: string;
  voteCount: number;
};

// Supabase join row: users embedded via FK on owner_user_id.
type JoinedRow = PhotoRow & { users: { email: string } | { email: string }[] | null };

function ownerEmailOf(row: JoinedRow): string {
  const u = row.users;
  if (!u) return "";
  return Array.isArray(u) ? (u[0]?.email ?? "") : u.email;
}

/**
 * Derive a public display name from an email local-part: take the part before
 * "@", replace runs of [._-] with spaces, and trim. Used so the public gallery
 * never leaks raw emails. Falls back to "" when no email is present.
 */
function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local.replace(/[._-]+/g, " ").trim();
}

/**
 * Active photos for the public gallery, newest first.
 * MUST NOT expose vote counts.
 */
export async function listActivePhotos(): Promise<GalleryPhoto[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("photos")
    .select("id, owner_user_id, image_url, thumbnail_url, caption, created_at, users(email)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data as unknown as JoinedRow[]).map((r) => ({
    id: r.id,
    imageUrl: r.image_url,
    thumbnailUrl: r.thumbnail_url,
    caption: r.caption,
    ownerUserId: r.owner_user_id,
    uploaderName: displayNameFromEmail(ownerEmailOf(r)),
    createdAt: r.created_at,
  }));
}

/**
 * All photos incl. soft-deleted, newest first, with owner email + vote count.
 * Admin only.
 */
export async function listAllPhotosAdmin(): Promise<AdminPhoto[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("photos")
    .select(
      "id, owner_user_id, image_url, thumbnail_url, caption, is_deleted, deleted_at, created_at, users(email), votes(count)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  type AdminJoin = JoinedRow & { votes: { count: number }[] | null };
  return (data as unknown as AdminJoin[]).map((r) => ({
    id: r.id,
    imageUrl: r.image_url,
    thumbnailUrl: r.thumbnail_url,
    caption: r.caption,
    ownerUserId: r.owner_user_id,
    ownerEmail: ownerEmailOf(r),
    isDeleted: r.is_deleted,
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
    voteCount: r.votes?.[0]?.count ?? 0,
  }));
}

/** Fetch a single photo row by id (incl. deleted). null if not found. */
export async function getPhotoById(id: string): Promise<PhotoRow | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("photos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as PhotoRow | null) ?? null;
}

export type CreatePhotoInput = {
  ownerUserId: string;
  imageUrl: string;
  imagePath: string;
  caption: string;
  thumbnailUrl?: string | null;
};

/** Count a user's active (non-deleted) photos — used to enforce the per-user cap. */
export async function countActivePhotosByOwner(ownerUserId: string): Promise<number> {
  const db = supabaseAdmin();
  const { count, error } = await db
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", ownerUserId)
    .eq("is_deleted", false);
  if (error) throw error;
  return count ?? 0;
}

/** Insert a new photo row and return it. */
export async function createPhoto(input: CreatePhotoInput): Promise<PhotoRow> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("photos")
    .insert({
      owner_user_id: input.ownerUserId,
      image_url: input.imageUrl,
      image_path: input.imagePath,
      thumbnail_url: input.thumbnailUrl ?? null,
      caption: input.caption,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as PhotoRow;
}

/**
 * Soft-delete a photo only if the caller owns it. Ownership is enforced in the
 * WHERE clause (owner_user_id = ownerUserId), never trusted from the client.
 * Returns true if a row was updated.
 */
export async function softDeletePhoto(
  photoId: string,
  ownerUserId: string,
): Promise<boolean> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("photos")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", photoId)
    .eq("owner_user_id", ownerUserId)
    .eq("is_deleted", false)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Admin soft-delete: no ownership check. */
export async function adminSoftDeletePhoto(photoId: string): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db
    .from("photos")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", photoId);
  if (error) throw error;
}

/** Admin restore: clear the soft-delete flag. */
export async function adminRestorePhoto(photoId: string): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db
    .from("photos")
    .update({ is_deleted: false, deleted_at: null })
    .eq("id", photoId);
  if (error) throw error;
}

/**
 * Top photos for reveal: active only, by vote count desc, tie-break earlier
 * created_at asc. Admin/reveal only — carries vote counts.
 */
export async function getTopPhotos(limit = 10): Promise<RankedPhoto[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("photos")
    .select(
      "id, owner_user_id, image_url, thumbnail_url, caption, created_at, users(email), votes(count)",
    )
    .eq("is_deleted", false);
  if (error) throw error;

  type RankJoin = JoinedRow & { votes: { count: number }[] | null };
  const rows = (data as unknown as RankJoin[]).map((r) => ({
    id: r.id,
    imageUrl: r.image_url,
    thumbnailUrl: r.thumbnail_url,
    caption: r.caption,
    ownerUserId: r.owner_user_id,
    ownerEmail: ownerEmailOf(r),
    createdAt: r.created_at,
    voteCount: r.votes?.[0]?.count ?? 0,
  }));

  // Sort in JS: count desc, then earlier created_at asc.
  rows.sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  });

  return rows.slice(0, limit);
}
