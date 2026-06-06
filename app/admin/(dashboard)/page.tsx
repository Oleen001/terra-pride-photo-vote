import Link from "next/link";
import { getDashboardSummary } from "@/lib/admin-stats";
import { getSettings } from "@/lib/settings";
import { StatCard } from "@/components/admin/stat-card";
import {
  GridIcon,
  ImageIcon,
  MailIcon,
  TrashIcon,
  UsersIcon,
  VoteIcon,
} from "@/components/admin/icons";

export const metadata = { title: "Overview · Terra Pride Admin" };

function StatusPill({ open, label }: { open: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          open
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-zinc-400"}`}
          aria-hidden
        />
        {open ? "Open" : "Closed"}
      </span>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [summary, settings] = await Promise.all([
    getDashboardSummary(),
    getSettings(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          A real-time snapshot of the photo voting event
        </p>
      </header>

      <section
        aria-label="Statistics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard
          label="Total photos"
          value={summary.totalPhotos}
          icon={<ImageIcon className="size-5" />}
        />
        <StatCard
          label="Active photos"
          value={summary.activePhotos}
          accent="positive"
          icon={<GridIcon className="size-5" />}
        />
        <StatCard
          label="Deleted photos"
          value={summary.deletedPhotos}
          accent={summary.deletedPhotos > 0 ? "danger" : "default"}
          icon={<TrashIcon className="size-5" />}
        />
        <StatCard
          label="Total votes"
          value={summary.totalVotes}
          icon={<VoteIcon className="size-5" />}
        />
        <StatCard
          label="Whitelisted emails"
          value={summary.whitelistCount}
          icon={<MailIcon className="size-5" />}
        />
        <StatCard
          label="Participants"
          value={summary.userCount}
          hint="People who have signed in"
          icon={<UsersIcon className="size-5" />}
        />
      </section>

      <section aria-label="Settings status" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Event status
          </h2>
          <Link
            href="/admin/settings"
            className="text-xs font-medium text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Manage settings
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatusPill open={settings.uploadOpen} label="Uploads" />
          <StatusPill open={settings.votingOpen} label="Voting" />
          <StatusPill open={settings.revealResultsOpen} label="Results reveal" />
        </div>
      </section>
    </div>
  );
}
