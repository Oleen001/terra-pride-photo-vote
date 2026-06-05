import { listEmailLogs } from "@/lib/email-log";
import { MailLogIcon } from "@/components/admin/icons";

export const metadata = { title: "บันทึกอีเมล · ผู้ดูแล Terra Pride" };

const LIMIT = 200;

const dateFmt = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

export default async function AdminEmailLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  const rows = await listEmailLogs({
    recipient: query || undefined,
    limit: LIMIT,
  });

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">บันทึกอีเมล</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          ตรวจสอบว่าระบบส่งอีเมล OTP ออกไปแล้วหรือยัง
          เมื่อมีผู้เข้าร่วมแจ้งว่าไม่ได้รับ
        </p>
      </header>

      <form method="get" className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="ค้นหาด้วยอีเมลผู้รับ"
          aria-label="ค้นหาด้วยอีเมลผู้รับ"
          className="min-h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
        />
        <button
          type="submit"
          className="min-h-11 cursor-pointer rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          ค้นหา
        </button>
        {query ? (
          <a
            href="/admin/logs"
            className="flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ล้าง
          </a>
        ) : null}
      </form>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {query ? `ผลการค้นหา “${query}”` : "อีเมลล่าสุด"}
          </h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {rows.length} รายการ · แสดงล่าสุดไม่เกิน {LIMIT}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <MailLogIcon className="size-6 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {query ? "ไม่พบบันทึกที่ตรงกับคำค้น" : "ยังไม่มีบันทึกการส่งอีเมล"}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {query
                ? "ลองตรวจสอบการสะกดอีเมล หรือล้างคำค้นเพื่อดูทั้งหมด"
                : "บันทึกจะปรากฏที่นี่เมื่อระบบเริ่มส่งอีเมล OTP"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {row.recipient}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {formatDate(row.created_at)}
                      {" · "}
                      {row.kind}
                      {row.provider ? ` · ส่งจาก ${row.provider}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {row.status === "sent" ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        ส่งสำเร็จ
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                        ส่งไม่สำเร็จ
                      </span>
                    )}
                  </div>
                </div>
                {row.status === "failed" && row.error ? (
                  <p className="max-h-32 overflow-y-auto break-words rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                    {row.error}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
