import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type EmailLog = {
  id: string;
  recipient: string;
  kind: string;
  status: "sent" | "failed";
  provider: string | null;
  error: string | null;
  created_at: string;
};

/** Record one email send attempt. Best-effort — never throws into the caller. */
export async function logEmail(entry: {
  recipient: string;
  status: "sent" | "failed";
  kind?: string;
  provider?: string | null;
  error?: string | null;
}): Promise<void> {
  try {
    await supabaseAdmin().from("email_logs").insert({
      recipient: entry.recipient,
      kind: entry.kind ?? "otp",
      status: entry.status,
      provider: entry.provider ?? null,
      error: entry.error ?? null,
    });
  } catch (err) {
    console.error("logEmail failed:", err);
  }
}

/** Count successful sends from a provider in the last 24h (for soft-limit routing). */
export async function countSentLast24h(provider: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin()
    .from("email_logs")
    .select("id", { count: "exact", head: true })
    .eq("provider", provider)
    .eq("status", "sent")
    .gt("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

/** Recent email logs, newest first; optional recipient substring filter. */
export async function listEmailLogs(opts?: {
  recipient?: string;
  limit?: number;
}): Promise<EmailLog[]> {
  let q = supabaseAdmin()
    .from("email_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);
  if (opts?.recipient) q = q.ilike("recipient", `%${opts.recipient}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EmailLog[];
}
