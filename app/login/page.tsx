import { redirect } from "next/navigation";
import Image from "next/image";
import { getParticipantSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Terra Pride" };

export default async function LoginPage() {
  if (await getParticipantSession()) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-8 sm:px-6 sm:py-12">
      <div className="login-card w-full max-w-[23rem] rounded-[8px] border border-line bg-surface/92 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur sm:p-7">
        <div className="mb-7 flex flex-col items-center text-center">
          <Image
            src="/terra-logo-full.svg"
            alt="Terra"
            width={154}
            height={65}
            priority
            unoptimized
            className="mb-6 h-11 w-auto"
          />
          <h1 className="login-title text-2xl text-foreground sm:text-[1.75rem]">
            Celebrate with us!
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">Sign in with your Terra email</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
