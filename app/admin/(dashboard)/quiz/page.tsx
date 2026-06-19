import Link from "next/link";
import {
  EndRunButton,
  LeaderboardToggleButton,
  DeleteQuestionButton,
  QuestionControlButtons,
  QuizEntryToggle,
  QuizQuestionEditor,
  QuizQuestionForm,
  QuizSetForm,
  RunPauseButton,
  SetActiveButton,
  StartRunButton,
} from "@/components/admin/quiz-forms";
import {
  getActiveQuizSet,
  getLatestActiveRun,
  getQuizSetQuestions,
  listLeaderboard,
  listQuizSetsAdmin,
} from "@/lib/quiz";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quiz · Terra Pride Admin" };

export default async function AdminQuizPage() {
  let data:
    | {
        sets: Awaited<ReturnType<typeof listQuizSetsAdmin>>;
        activeSet: Awaited<ReturnType<typeof getActiveQuizSet>>;
        questions: Awaited<ReturnType<typeof getQuizSetQuestions>>;
        run: Awaited<ReturnType<typeof getLatestActiveRun>>;
        leaderboard: Awaited<ReturnType<typeof listLeaderboard>>;
        settings: Awaited<ReturnType<typeof getSettings>>;
      }
    | null = null;
  let loadError: string | null = null;

  try {
    const sets = await listQuizSetsAdmin();
    const activeSet = await getActiveQuizSet();
    const questions = activeSet ? await getQuizSetQuestions(activeSet.id) : [];
    const run = activeSet ? await getLatestActiveRun(activeSet.id) : null;
    const leaderboard = run && !run.hideLeaderboard ? await listLeaderboard(run.id) : [];
    const settings = await getSettings();
    data = { sets, activeSet, questions, run, leaderboard, settings };
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load quiz data.";
  }

  if (loadError || !data) {
    return (
      <div className="flex flex-col gap-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Run the quiz migration before using this page.
          </p>
        </header>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {loadError}
        </div>
      </div>
    );
  }

  const { sets, activeSet, questions, run, leaderboard, settings } = data;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Create quiz sets, run practice or live mode, pause questions, and control the TV view.
          </p>
        </div>
        <Link
          href="/quiz/live"
          target="_blank"
          className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[#529bc9] px-4 text-sm font-semibold text-white transition hover:bg-[#438dbb]"
        >
          Open TV view
        </Link>
      </header>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <QuizSetForm />
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Quiz sets
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {sets.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No quiz sets yet.
              </p>
            )}
            {sets.map((set) => (
              <div
                key={set.id}
                className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {set.title}
                    </h3>
                    {set.isActive && (
                      <span className="rounded-full bg-[#529bc9]/10 px-2 py-0.5 text-xs font-semibold text-[#347da9] dark:text-[#80c8f2]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {set.questionCount ?? 0} questions
                    {set.description ? ` · ${set.description}` : ""}
                  </p>
                </div>
                {!set.isActive && <SetActiveButton quizSetId={set.id} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {activeSet ? (
        <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="flex flex-col gap-4">
            <QuizQuestionForm quizSetId={activeSet.id} />
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Run controls
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Active set: {activeSet.title}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    settings.quizOpen
                      ? "bg-[#529bc9]/10 text-[#347da9] dark:text-[#80c8f2]"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  Entry {settings.quizOpen ? "open" : "closed"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <QuizEntryToggle open={settings.quizOpen} />
                <StartRunButton quizSetId={activeSet.id} mode="practice" />
                <StartRunButton quizSetId={activeSet.id} mode="live" />
                <EndRunButton quizSetId={activeSet.id} />
              </div>
              {run && (
                <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                      {run.mode}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                      {run.state.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <RunPauseButton runId={run.id} state={run.state} />
                    <LeaderboardToggleButton
                      runId={run.id}
                      hidden={run.hideLeaderboard}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Questions
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {questions.length === 0 && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Add at least one question before starting the live game.
                  </p>
                )}
                {questions.map((question) => (
                  <div
                    key={question.id}
                    className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-400">
                          Q{question.sortOrder}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {question.timeLimitSeconds}s
                        </span>
                        {run?.currentQuestionId === question.id && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            Current
                          </span>
                        )}
                        {question.voidedAt && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                            Void
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {question.prompt}
                      </p>
                    </div>
                    {run && run.state !== "ended" && (
                      <QuestionControlButtons
                        runId={run.id}
                        questionId={question.id}
                        isCurrent={run.currentQuestionId === question.id}
                        voided={Boolean(question.voidedAt)}
                      />
                    )}
                    <QuizQuestionEditor question={question} />
                    <DeleteQuestionButton questionId={question.id} />
                  </div>
                ))}
              </div>
            </div>

            {run && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Leaderboard
                </h2>
                {run.hideLeaderboard ? (
                  <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                    Hidden on participant and TV screens.
                  </p>
                ) : (
                  <ol className="mt-4 flex flex-col gap-2">
                    {leaderboard.map((entry) => (
                      <li
                        key={entry.userId}
                        className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-950"
                      >
                        <span>
                          #{entry.rank} {entry.displayName}
                        </span>
                        <span className="font-semibold">{entry.totalScore}</span>
                      </li>
                    ))}
                    {leaderboard.length === 0 && (
                      <li className="text-sm text-zinc-500 dark:text-zinc-400">
                        No answers yet.
                      </li>
                    )}
                  </ol>
                )}
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Create a set and mark it active to add questions and start a run.
        </div>
      )}
    </div>
  );
}
