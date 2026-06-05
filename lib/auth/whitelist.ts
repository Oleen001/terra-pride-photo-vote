import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/validation";

/** True if the email is on the whitelist. */
export async function isWhitelisted(email: string): Promise<boolean> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("whitelist_emails")
    .select("id")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
