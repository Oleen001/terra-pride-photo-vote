import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminLoginForm } from "./admin-login-form";

export const metadata = { title: "ผู้ดูแลระบบ · Terra Pride" };

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Terra Pride · ผู้ดูแล</h1>
          <p className="mt-1 text-sm text-zinc-500">เข้าสู่ระบบสำหรับผู้ดูแลงาน</p>
        </div>
        <AdminLoginForm />
      </div>
    </main>
  );
}
