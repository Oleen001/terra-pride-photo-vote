import { redirect } from "next/navigation";
import { getParticipantSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "เข้าสู่ระบบ · Terra Pride" };

export default async function LoginPage() {
  if (await getParticipantSession()) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-[8px] border border-line bg-surface/92 p-6 shadow-[0_24px_70px_rgba(36,28,20,0.12)] backdrop-blur">
        <div className="mb-8 text-center">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            Private Access
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-normal text-foreground">
            Terra Pride
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">เข้าสู่ระบบด้วยอีเมลที่ได้รับเชิญ</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
