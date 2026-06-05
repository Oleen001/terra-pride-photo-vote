import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { adminLogoutAction } from "@/app/admin/login/actions";
import { SidebarNav } from "@/components/admin/sidebar-nav";
import { LogoutIcon } from "@/components/admin/icons";

export const metadata = { title: "ผู้ดูแลระบบ · Terra Pride" };

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 lg:flex-row">
      <aside className="flex flex-col gap-6 border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-6">
        <div className="flex items-center justify-between lg:block">
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Terra Pride
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              แผงผู้ดูแล
            </p>
          </div>
        </div>

        <SidebarNav />

        <div className="mt-auto flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              เข้าสู่ระบบเป็น
            </p>
            <p className="truncate text-sm font-medium" title={session.email}>
              {session.email}
            </p>
          </div>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <LogoutIcon className="size-4" />
              ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-5 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
