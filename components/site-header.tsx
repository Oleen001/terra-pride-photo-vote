import Link from "next/link";
import { getParticipantSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { logoutAction } from "@/app/login/actions";
import { UploadIcon } from "@/components/icons";

export async function SiteHeader() {
  const [session, settings] = await Promise.all([
    getParticipantSession(),
    getSettings().catch(() => ({
      uploadOpen: false,
      votingOpen: false,
      revealResultsOpen: false,
    })),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-background/80 backdrop-blur-md dark:border-zinc-800/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-900 text-[13px] font-bold text-white dark:bg-white dark:text-zinc-900">
            T
          </span>
          <span className="text-zinc-900 dark:text-zinc-50">Terra Pride</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/">Gallery</NavLink>
          {settings.revealResultsOpen && <NavLink href="/results">Results</NavLink>}

          {session ? (
            <>
              {settings.uploadOpen && (
                <Link
                  href="/upload"
                  className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  <UploadIcon className="h-4 w-4" />
                  Upload
                </Link>
              )}
              <span className="ml-2 hidden max-w-[160px] truncate text-xs text-zinc-500 dark:text-zinc-400 sm:inline">
                {session.email}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="ml-1 inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition-colors duration-200 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-1 inline-flex h-9 items-center rounded-lg bg-zinc-900 px-3.5 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition-colors duration-200 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {children}
    </Link>
  );
}
