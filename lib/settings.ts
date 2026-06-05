import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AppSettings = {
  uploadOpen: boolean;
  votingOpen: boolean;
  revealResultsOpen: boolean;
};

/** Read the singleton settings row (id = 1). */
export async function getSettings(): Promise<AppSettings> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("app_settings")
    .select("upload_open, voting_open, reveal_results_open")
    .eq("id", 1)
    .single();
  if (error) throw error;

  const row = data as {
    upload_open: boolean;
    voting_open: boolean;
    reveal_results_open: boolean;
  };
  return {
    uploadOpen: row.upload_open,
    votingOpen: row.voting_open,
    revealResultsOpen: row.reveal_results_open,
  };
}

/** Update one or more setting toggles on the singleton row. */
export async function updateSettings(
  partial: Partial<AppSettings>,
): Promise<AppSettings> {
  const db = supabaseAdmin();
  const patch: Record<string, boolean | string> = {
    updated_at: new Date().toISOString(),
  };
  if (partial.uploadOpen !== undefined) patch.upload_open = partial.uploadOpen;
  if (partial.votingOpen !== undefined) patch.voting_open = partial.votingOpen;
  if (partial.revealResultsOpen !== undefined)
    patch.reveal_results_open = partial.revealResultsOpen;

  const { data, error } = await db
    .from("app_settings")
    .update(patch)
    .eq("id", 1)
    .select("upload_open, voting_open, reveal_results_open")
    .single();
  if (error) throw error;

  const row = data as {
    upload_open: boolean;
    voting_open: boolean;
    reveal_results_open: boolean;
  };
  return {
    uploadOpen: row.upload_open,
    votingOpen: row.voting_open,
    revealResultsOpen: row.reveal_results_open,
  };
}
