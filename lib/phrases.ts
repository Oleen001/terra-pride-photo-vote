import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PhraseRow = {
  id: string;
  text: string;
  created_at: string;
};

const MAX_PHRASE_LEN = 60;

/** Just the phrase texts, newest first — for the gallery typewriter. */
export async function listPhrases(): Promise<string[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("typewriter_phrases")
    .select("text")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as { text: string }[]).map((r) => r.text);
}

/** All phrase rows, newest first — for the admin list. */
export async function listPhrasesAdmin(): Promise<PhraseRow[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("typewriter_phrases")
    .select("id, text, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as PhraseRow[];
}

/**
 * Add a phrase. Trims/collapses whitespace; rejects empty or >60 chars.
 * Returns the new row. Throws on validation failure (callers should validate
 * first; this is a defensive last line).
 */
export async function addPhrase(text: string): Promise<PhraseRow> {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) throw new Error("Phrase can't be empty.");
  if (normalized.length > MAX_PHRASE_LEN) {
    throw new Error(`Phrase must be ${MAX_PHRASE_LEN} characters or fewer.`);
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("typewriter_phrases")
    .insert({ text: normalized })
    .select("id, text, created_at")
    .single();
  if (error) throw error;
  return data as PhraseRow;
}

/** Remove a phrase by id. No-op if absent. */
export async function removePhrase(id: string): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.from("typewriter_phrases").delete().eq("id", id);
  if (error) throw error;
}
