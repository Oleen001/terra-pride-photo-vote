import Link from "next/link";
import Image from "next/image";
import { getParticipantSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { logoutAction } from "@/app/login/actions";
import { UploadIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <header className="sticky top-0 z-40 border-b border-line/80 bg-background/86 shadow-[0_1px_0_rgba(255,255,255,0.55)_inset] backdrop-blur-xl">
      <div className="h-0.5 bg-[linear-gradient(90deg,#e4345d,#f59e0b,#f6d84b,#159a6c,#1686d9,#7c3aed)]" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-tight"
        >
          <Image
            src="/terra-logo-full-light.svg"
            alt="Terra Pride"
            width={128}
            height={54}
            priority
            unoptimized
            className="h-9 w-auto dark:hidden"
          />
          <Image
            src="/terra-logo-full.svg"
            alt=""
            width={128}
            height={54}
            priority
            unoptimized
            aria-hidden="true"
            className="hidden h-9 w-auto dark:block"
          />
        </Link>

        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLink href="/">Gallery</NavLink>
          {settings.revealResultsOpen && <NavLink href="/results">Results</NavLink>}
          <ThemeToggle />

          {session ? (
            <>
              {settings.uploadOpen && (
                <Link
                  href="/upload"
                  className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-foreground px-3.5 text-[13px] font-semibold text-background shadow-sm transition duration-200 hover:translate-y-[-1px] hover:shadow-md"
                >
                  <UploadIcon className="h-4 w-4" />
                  Upload
                </Link>
              )}
              <span className="ml-2 hidden max-w-[160px] truncate text-xs text-muted sm:inline">
                {session.email}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="ml-1 inline-flex h-9 cursor-pointer items-center rounded-[8px] px-3 text-[13px] font-medium text-muted transition-colors duration-200 hover:bg-foreground/6 hover:text-foreground"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-1 inline-flex h-9 items-center rounded-[8px] bg-foreground px-3.5 text-[13px] font-semibold text-background shadow-sm transition duration-200 hover:translate-y-[-1px] hover:shadow-md"
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
      className="inline-flex h-9 items-center rounded-[8px] px-3 text-[13px] font-medium text-muted transition-colors duration-200 hover:bg-foreground/6 hover:text-foreground"
    >
      {children}
    </Link>
  );
}
