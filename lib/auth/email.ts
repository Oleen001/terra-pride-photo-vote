import "server-only";
import { env } from "@/lib/env";
import { logEmail } from "@/lib/email-log";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

function otpContent(code: string) {
  return {
    subject: `รหัสเข้าสู่ระบบ Terra Pride: ${code}`,
    textContent: `รหัส OTP ของคุณคือ ${code}\nรหัสนี้ใช้ได้ภายใน 10 นาที และใช้ได้ครั้งเดียว`,
    htmlContent: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
        <h1 style="font-size:18px;margin:0 0 8px">Terra Pride Photo Vote</h1>
        <p style="font-size:14px;color:#666;margin:0 0 24px">รหัสเข้าสู่ระบบของคุณ</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;background:#f4f4f5;border-radius:12px;padding:20px;text-align:center">${code}</div>
        <p style="font-size:13px;color:#888;margin:24px 0 0">รหัสนี้ใช้ได้ภายใน 10 นาที และใช้ได้ครั้งเดียว หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้</p>
      </div>`,
  };
}

/**
 * Send an OTP via Brevo's HTTP API (port 443). We use HTTP rather than SMTP
 * because managed PaaS hosts (Render, Railway) block outbound SMTP ports.
 * Every attempt is recorded to email_logs for the admin audit view.
 * Throws on failure so the caller can surface an error.
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const content = otpContent(code);
  const provider = `brevo:${env.mailFromEmail}`;

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": env.brevoApiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: env.mailFromName, email: env.mailFromEmail },
        to: [{ email }],
        ...content,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo ${res.status}: ${body.slice(0, 300)}`);
    }

    await logEmail({ recipient: email, status: "sent", provider });
    console.log(`[otp] sent to ${email} via Brevo`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logEmail({ recipient: email, status: "failed", provider, error: message });
    console.error(`[otp] Brevo send to ${email} failed:`, err);
    throw err;
  }
}
