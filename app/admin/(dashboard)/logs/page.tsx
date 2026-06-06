import { listEmailLogs } from "@/lib/email-log";
import { MailLogIcon } from "@/components/admin/icons";

export const metadata = { title: "Email logs · Terra Pride Admin" };

const LIMIT = 200;

const dateFmt = new Intl.DateTimeFormat("en-US", {
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
        <h1 className="text-2xl font-semibold tracking-tight">Email logs</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Check whether OTP emails went out when a participant says they didn&apos;t receive one.
        </p>
      </header>

      <form method="get" className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by recipient email"
          aria-label="Search by recipient email"
          className="min-h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
        />
        <button
          type="submit"
          className="min-h-11 cursor-pointer rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Search
        </button>
        {query ? (
          <a
            href="/admin/logs"
            className="flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Clear
          </a>
        ) : null}
      </form>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {query ? `Results for “${query}”` : "Recent emails"}
          </h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {rows.length} {rows.length === 1 ? "entry" : "entries"} · showing up to {LIMIT} most recent
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <MailLogIcon className="size-6 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {query ? "No logs match your search" : "No email activity yet"}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {query
                ? "Try checking the email spelling, or clear the search to see everything."
                : "Logs will appear here once the system starts sending OTP emails."}
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
                      {row.provider ? ` · via ${row.provider}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {row.status === "sent" ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                        Failed
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
