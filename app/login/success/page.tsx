import { redirect } from "next/navigation";
import Image from "next/image";
import { getParticipantSession } from "@/lib/session";
import { safeLoginNextPath } from "@/lib/auth/next-path";
import { LoginSuccessCountdown } from "./countdown";

export const metadata = { title: "Signed in · Terra Pride" };

export default async function LoginSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next: rawNext } = await searchParams;
  const next = safeLoginNextPath(rawNext);

  const session = await getParticipantSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-8 sm:px-6 sm:py-12">
      <div className="login-card w-full max-w-[23rem] rounded-[8px] border border-line bg-surface/92 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur sm:p-7">
        <div className="mb-7 flex flex-col items-center text-center">
          <Image
            src="/terra-logo-full-light.svg"
            alt="Terra"
            width={154}
            height={65}
            priority
            unoptimized
            className="mb-6 h-11 w-auto dark:hidden"
          />
          <Image
            src="/terra-logo-full.svg"
            alt=""
            width={154}
            height={65}
            priority
            unoptimized
            aria-hidden="true"
            className="mb-6 hidden h-11 w-auto dark:block"
          />
          <h1 className="login-title text-2xl text-foreground sm:text-[1.75rem]">
            Signed in
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">Signed in as</p>
          <p className="mt-1 max-w-full break-words text-sm font-semibold text-foreground">
            {session.email}
          </p>
        </div>

        <LoginSuccessCountdown next={next} />
      </div>
    </main>
  );
}
