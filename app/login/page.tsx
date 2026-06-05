import { redirect } from "next/navigation";
import { getParticipantSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "เข้าสู่ระบบ · Terra Pride" };

export default async function LoginPage() {
  if (await getParticipantSession()) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Terra Pride</h1>
          <p className="mt-1 text-sm text-zinc-500">เข้าสู่ระบบด้วยอีเมลที่ได้รับเชิญ</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
