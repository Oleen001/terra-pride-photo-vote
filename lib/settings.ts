import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AppSettings = {
  uploadOpen: boolean;
  votingOpen: boolean;
  revealResultsOpen: boolean;
  quizOpen: boolean;
  activeQuizSetId: string | null;
};

/** Read the singleton settings row (id = 1). */
export async function getSettings(): Promise<AppSettings> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;

  const row = data as {
    upload_open: boolean;
    voting_open: boolean;
    reveal_results_open: boolean;
    quiz_open?: boolean;
    active_quiz_set_id?: string | null;
  };
  return {
    uploadOpen: row.upload_open,
    votingOpen: row.voting_open,
    revealResultsOpen: row.reveal_results_open,
    quizOpen: row.quiz_open ?? false,
    activeQuizSetId: row.active_quiz_set_id ?? null,
  };
}

/** Update one or more setting toggles on the singleton row. */
export async function updateSettings(
  partial: Partial<AppSettings>,
): Promise<AppSettings> {
  const db = supabaseAdmin();
  const patch: Record<string, boolean | string | null> = {
    updated_at: new Date().toISOString(),
  };
  if (partial.uploadOpen !== undefined) patch.upload_open = partial.uploadOpen;
  if (partial.votingOpen !== undefined) patch.voting_open = partial.votingOpen;
  if (partial.revealResultsOpen !== undefined)
    patch.reveal_results_open = partial.revealResultsOpen;
  if (partial.quizOpen !== undefined) patch.quiz_open = partial.quizOpen;
  if (partial.activeQuizSetId !== undefined)
    patch.active_quiz_set_id = partial.activeQuizSetId;

  const { data, error } = await db
    .from("app_settings")
    .update(patch)
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw error;

  const row = data as {
    upload_open: boolean;
    voting_open: boolean;
    reveal_results_open: boolean;
    quiz_open?: boolean;
    active_quiz_set_id?: string | null;
  };
  return {
    uploadOpen: row.upload_open,
    votingOpen: row.voting_open,
    revealResultsOpen: row.reveal_results_open,
    quizOpen: row.quiz_open ?? false,
    activeQuizSetId: row.active_quiz_set_id ?? null,
  };
}
