import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/validation";

export type LoginAuditEvent =
  | "magic_link_created"
  | "magic_link_used"
  | "magic_link_failed"
  | "login_success";

export async function logLoginAudit(entry: {
  email?: string | null;
  event: LoginAuditEvent;
  status: "success" | "failed" | "created";
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  try {
    await supabaseAdmin().from("login_audit_events").insert({
      email: entry.email ? normalizeEmail(entry.email) : null,
      event: entry.event,
      status: entry.status,
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    console.error("logLoginAudit failed:", err);
  }
}
