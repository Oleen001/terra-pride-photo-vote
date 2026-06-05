import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type DashboardSummary = {
  totalPhotos: number;
  activePhotos: number;
  deletedPhotos: number;
  totalVotes: number;
  whitelistCount: number;
  userCount: number;
};

/** Counts for the admin dashboard. Uses head+count queries (no row payload). */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = supabaseAdmin();

  const [totalPhotos, activePhotos, deletedPhotos, totalVotes, whitelist, users] =
    await Promise.all([
      db.from("photos").select("*", { count: "exact", head: true }),
      db
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false),
      db
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", true),
      db.from("votes").select("*", { count: "exact", head: true }),
      db.from("whitelist_emails").select("*", { count: "exact", head: true }),
      db.from("users").select("*", { count: "exact", head: true }),
    ]);

  for (const r of [totalPhotos, activePhotos, deletedPhotos, totalVotes, whitelist, users]) {
    if (r.error) throw r.error;
  }

  return {
    totalPhotos: totalPhotos.count ?? 0,
    activePhotos: activePhotos.count ?? 0,
    deletedPhotos: deletedPhotos.count ?? 0,
    totalVotes: totalVotes.count ?? 0,
    whitelistCount: whitelist.count ?? 0,
    userCount: users.count ?? 0,
  };
}
