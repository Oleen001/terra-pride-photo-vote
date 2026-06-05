import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { logEmail, countSentLast24h } from "@/lib/email-log";

// Stay safely under Gmail's ~500/day cap; switch to the next account at this point.
const SOFT_DAILY_LIMIT = 400;

// One transporter per sender account. Works with Gmail (smtp.gmail.com:465,
// App Password) or any SMTP host. Multiple accounts enable failover when one
// hits its daily sending limit.
const transporters = env.smtpAccounts.map((acc) => ({
  user: acc.user,
  tx: nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: acc.user, pass: acc.pass },
  }),
}));

function otpContent(code: string) {
  return {
    subject: `รหัสเข้าสู่ระบบ Terra Pride: ${code}`,
    text: `รหัส OTP ของคุณคือ ${code}\nรหัสนี้ใช้ได้ภายใน 10 นาที และใช้ได้ครั้งเดียว`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
        <h1 style="font-size:18px;margin:0 0 8px">Terra Pride Photo Vote</h1>
        <p style="font-size:14px;color:#666;margin:0 0 24px">รหัสเข้าสู่ระบบของคุณ</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;background:#f4f4f5;border-radius:12px;padding:20px;text-align:center">${code}</div>
        <p style="font-size:13px;color:#888;margin:24px 0 0">รหัสนี้ใช้ได้ภายใน 10 นาที และใช้ได้ครั้งเดียว หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้</p>
      </div>`,
  };
}

/**
 * Order accounts for sending: keep configured order but push any account that
 * has already sent >= SOFT_DAILY_LIMIT today to the back (least-used first).
 * This proactively rotates to the next account before the first hits Gmail's
 * hard cap, instead of waiting for a (sometimes silent) limit bounce.
 */
async function orderedAccounts() {
  const withUsage = await Promise.all(
    transporters.map(async (t, i) => ({
      ...t,
      i,
      sent: await countSentLast24h(t.user).catch(() => 0),
    })),
  );
  const under = withUsage.filter((a) => a.sent < SOFT_DAILY_LIMIT); // keeps config order
  const over = withUsage
    .filter((a) => a.sent >= SOFT_DAILY_LIMIT)
    .sort((a, b) => a.sent - b.sent);
  return [...under, ...over];
}

/**
 * Send an OTP. Picks an account under its daily soft-limit, and on any send
 * failure falls through to the next account. Every attempt is logged to
 * email_logs for the admin audit view. Throws only if all accounts fail.
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const content = otpContent(code);
  let lastError: unknown;

  for (const { user, tx } of await orderedAccounts()) {
    try {
      const info = await tx.sendMail({
        from: `${env.mailFromName} <${user}>`,
        to: email,
        ...content,
      });
      await logEmail({ recipient: email, status: "sent", provider: user });
      console.log(`[otp] sent to ${email} via ${user} (id ${info.messageId})`);
      return;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      await logEmail({ recipient: email, status: "failed", provider: user, error: message });
      console.error(`[otp] send to ${email} via ${user} failed:`, err);
      // try next account
    }
  }

  throw lastError ?? new Error("No SMTP accounts configured");
}
