import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getParticipantSession } from "@/lib/session";
import { getPublicQuizState, joinQuizRun } from "@/lib/quiz";
import { ParticipantQuiz } from "@/components/quiz/participant-quiz";

export const metadata: Metadata = {
  title: "Quiz · Terra Pride",
  description: "Join the Terra Pride live quiz.",
};

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const session = await getParticipantSession();
  if (!session) redirect("/login?next=/quiz");

  let state: Awaited<ReturnType<typeof getPublicQuizState>> | null = null;
  let loadError: string | null = null;

  try {
    state = await getPublicQuizState(session.userId);
    if (state.quizOpen && state.run && state.run.state !== "ended") {
      const displayName =
        session.email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Player";
      await joinQuizRun(state.run.id, session.userId, displayName).catch(() => null);
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load quiz.";
  }

  if (!state) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-5 py-10">
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {loadError}
        </div>
      </main>
    );
  }

  return <ParticipantQuiz initialState={state} userEmail={session.email} />;
}
