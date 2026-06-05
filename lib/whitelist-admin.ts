import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/validation";

export type WhitelistRow = {
  id: string;
  email: string;
  created_at: string;
};

/** All whitelist entries, newest first. */
export async function listWhitelist(): Promise<WhitelistRow[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("whitelist_emails")
    .select("id, email, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as WhitelistRow[];
}

/**
 * Add an email to the whitelist. Normalizes first; a duplicate (unique email)
 * is silently ignored. Returns the existing or new row.
 */
export async function addWhitelistEmail(email: string): Promise<WhitelistRow> {
  const db = supabaseAdmin();
  const normalized = normalizeEmail(email);
  const { data, error } = await db
    .from("whitelist_emails")
    .upsert({ email: normalized }, { onConflict: "email", ignoreDuplicates: false })
    .select("id, email, created_at")
    .single();
  if (error) throw error;
  return data as WhitelistRow;
}

/** Remove a whitelist entry by id. No-op if absent. */
export async function removeWhitelistEmail(id: string): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.from("whitelist_emails").delete().eq("id", id);
  if (error) throw error;
}
