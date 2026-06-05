import { listWhitelist } from "@/lib/whitelist-admin";
import { WhitelistAddForm } from "@/components/admin/whitelist-add-form";
import { WhitelistRemoveButton } from "@/components/admin/whitelist-remove-button";
import { MailIcon } from "@/components/admin/icons";

export const metadata = { title: "Whitelist · ผู้ดูแล Terra Pride" };

const dateFmt = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

export default async function AdminWhitelistPage() {
  const rows = await listWhitelist();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Whitelist</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          เฉพาะอีเมลในรายการนี้เท่านั้นที่เข้าร่วมและโหวตได้
        </p>
      </header>

      <WhitelistAddForm />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            อีเมลที่อนุญาต
          </h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {rows.length} รายการ
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <MailIcon className="size-6 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              ยังไม่มีอีเมลใน whitelist
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              เพิ่มอีเมลด้านบนเพื่อให้ผู้เข้าร่วมเริ่มล็อกอินได้
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {row.email}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    เพิ่มเมื่อ {formatDate(row.created_at)}
                  </p>
                </div>
                <div className="shrink-0">
                  <WhitelistRemoveButton id={row.id} email={row.email} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
