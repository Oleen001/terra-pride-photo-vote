import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/validation";

export type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_login_at: string | null;
};

/**
 * Find or create the user for this email, and stamp last_login_at.
 * Called only after the login flow has authorized the email.
 */
export async function upsertUserOnLogin(email: string): Promise<UserRow> {
  const db = supabaseAdmin();
  const normalized = normalizeEmail(email);
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("users")
    .upsert(
      { email: normalized, last_login_at: now },
      { onConflict: "email" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as UserRow;
}
