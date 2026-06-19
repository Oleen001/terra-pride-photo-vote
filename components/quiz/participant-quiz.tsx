"use client";

import { Icon } from "@iconify/react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { PublicQuizState } from "@/lib/quiz";

type ParticipantQuizProps = {
  initialState: PublicQuizState;
  userEmail: string;
};

export function ParticipantQuiz({ initialState, userEmail }: ParticipantQuizProps) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const [resultOverlay, setResultOverlay] = useState<"correct" | "wrong" | null>(
    null,
  );
  const lastOverlayKey = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const remainingSeconds = useRemainingSeconds(state);
  const selectedChoice = state.choices.find(
    (choice) => choice.id === state.selectedChoiceId,
  );
  const selectedChoiceIsCorrect = selectedChoice?.isCorrect;
  const overlayKey =
    state.showAnswer && state.selectedChoiceId
      ? `${state.run?.id ?? "run"}:${state.question?.id ?? "question"}:${state.selectedChoiceId}`
      : null;

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const response = await fetch("/api/quiz/state", { cache: "no-store" });
        const next = await response.json();
        if (!active) return;
        if (response.ok) {
          setState(next);
          setError(null);
        } else {
          setError(next.error ?? "Could not load quiz state.");
        }
      } catch {
        if (active) setError("Connection interrupted.");
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!overlayKey || selectedChoiceIsCorrect === undefined) return;
    if (lastOverlayKey.current === overlayKey) return;
    lastOverlayKey.current = overlayKey;
    setResultOverlay(selectedChoiceIsCorrect ? "correct" : "wrong");
    const id = window.setTimeout(() => setResultOverlay(null), 3000);
    return () => window.clearTimeout(id);
  }, [overlayKey, selectedChoiceIsCorrect]);

  function submit(choiceId: string) {
    if (!state.run || !state.question || !state.canAnswer) return;
    setPendingChoice(choiceId);
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: state.run?.id,
          questionId: state.question?.id,
          choiceId,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(prettyAnswerError(result.error));
      }
      const next = await fetch("/api/quiz/state", { cache: "no-store" });
      if (next.ok) setState(await next.json());
      setPendingChoice(null);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-4 rounded-[8px] border border-line bg-surface p-5 shadow-[0_18px_46px_rgba(39,32,24,0.08)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Terra Pride Quiz
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              {state.activeSet?.title ?? "Live quiz room"}
            </h1>
            <p className="mt-2 text-sm text-muted">Signed in as {userEmail}</p>
          </div>
          <StatusPill state={state} />
        </div>
      </header>

      {error && (
        <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      <section
        aria-live="polite"
        className="min-h-[410px] rounded-[8px] border border-line bg-surface p-5 shadow-[0_18px_46px_rgba(39,32,24,0.08)] sm:p-6"
      >
        {!state.quizOpen ? (
          <CenteredState
            title="Quiz is not open yet"
            body="Please wait for the organizer to open the quiz entry."
            metric="Waiting"
          />
        ) : !state.activeSet ? (
          <CenteredState
            title="No active quiz set"
            body="The organizer is preparing the quiz."
            metric="Stand by"
          />
        ) : !state.run || state.run.state === "lobby" || state.run.state === "closed" ? (
          <CenteredState
            title="You're in"
            body="Keep this screen open. The question will appear here."
            metric={`${state.participantsReady} ready`}
          />
        ) : state.run.state === "paused" ? (
          <CenteredState
            title="Paused"
            body="The organizer paused the question. Answers are closed for now."
            metric="Paused"
          />
        ) : state.run.state === "ended" ? (
          <CenteredState title="Quiz ended" body="Thanks for playing." metric="Done" />
        ) : state.question ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-accent">
                  Question {state.question.position}
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight">
                  {state.question.prompt}
                </h2>
              </div>
              <div className="grid size-16 shrink-0 place-items-center rounded-full border border-line bg-background font-mono text-xl font-semibold">
                {remainingSeconds}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {state.choices.map((choice, index) => {
                const selected = state.selectedChoiceId === choice.id;
                const submitting = pendingChoice === choice.id && isPending;
                const correct = state.showAnswer && choice.isCorrect;
                const stats = choiceStats(state, choice.id);
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={!state.canAnswer || isPending}
                    onClick={() => submit(choice.id)}
                    className={`flex min-h-24 items-center gap-4 rounded-[8px] border p-4 text-left transition duration-200 disabled:cursor-not-allowed disabled:opacity-90 ${choiceTone({ correct, selected, revealed: state.showAnswer })}`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-current/10 font-mono text-sm font-bold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold">{choice.label}</span>
                      {state.showAnswer && (
                        <span className="mt-2 block">
                          <span className="flex items-center justify-between text-xs font-semibold opacity-80">
                            <span>{stats.count} selected</span>
                            <span>{stats.percent}%</span>
                          </span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-current/12">
                            <span
                              className="block h-full rounded-full bg-current/55"
                              style={{ width: `${stats.percent}%` }}
                            />
                          </span>
                        </span>
                      )}
                    </span>
                    {submitting && <span className="ml-auto text-sm">Sending...</span>}
                  </button>
                );
              })}
            </div>

            {state.selectedChoiceId && !state.showAnswer && (
              <CenteredState
                title="Answer locked"
                body="Your answer is in. The correct answer will appear when the timer ends."
                metric={`${remainingSeconds}s left · ${state.answersReceived}/${state.participantsReady} answered`}
                compact
              />
            )}

            {state.showAnswer && <Leaderboard entries={state.leaderboard} />}
          </div>
        ) : (
          <CenteredState
            title="Waiting for next question"
            body="The organizer is setting up the next round."
            metric="Ready"
          />
        )}
      </section>

      {resultOverlay && <ResultOverlay result={resultOverlay} />}
    </div>
  );
}

function choiceTone({
  correct,
  selected,
  revealed,
}: {
  correct: boolean | undefined;
  selected: boolean;
  revealed: boolean;
}) {
  if (revealed && correct && selected) {
    return "border-emerald-700 bg-emerald-600 text-white shadow-sm";
  }
  if (revealed && correct) {
    return "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200";
  }
  if (selected) {
    return "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950";
  }
  return "border-line bg-background text-foreground hover:border-zinc-400";
}

function choiceStats(state: PublicQuizState, choiceId: string) {
  const answered = state.participants.filter(
    (participant) => participant.selectedChoiceId,
  );
  const count = answered.filter(
    (participant) => participant.selectedChoiceId === choiceId,
  ).length;
  const percent = answered.length > 0 ? Math.round((count / answered.length) * 100) : 0;
  return { count, percent };
}

function ResultOverlay({ result }: { result: "correct" | "wrong" }) {
  const correct = result === "correct";
  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/45 px-6 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm rounded-[8px] border px-6 py-8 text-center shadow-[0_22px_70px_rgba(39,32,24,0.18)] ${
          correct
            ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100"
            : "border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        }`}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.18em]">
          {correct ? "Correct" : "Not correct"}
        </p>
        <p className="mt-2 text-3xl font-semibold">
          {correct ? "You got it" : "Try the next one"}
        </p>
      </div>
    </div>
  );
}

function StatusPill({ state }: { state: PublicQuizState }) {
  const label = state.run?.state?.replace("_", " ") ?? "waiting";
  return (
    <div className="rounded-[8px] border border-line bg-background px-3 py-2 text-right">
      <p className="text-xs font-medium text-muted">Status</p>
      <p className="text-sm font-semibold capitalize">{label}</p>
    </div>
  );
}

function useRemainingSeconds(state: PublicQuizState) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  if (!state.run?.currentQuestionEndsAt || state.run.state !== "question_active") {
    return 0;
  }
  return Math.max(
    0,
    Math.ceil((new Date(state.run.currentQuestionEndsAt).getTime() - now) / 1000),
  );
}

function CenteredState({
  title,
  body,
  metric,
  compact = false,
}: {
  title: string;
  body: string;
  metric: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "rounded-[8px] border border-line bg-background px-4 py-4 text-center" : "grid min-h-[360px] place-items-center text-center"}>
      <div className="flex max-w-sm flex-col items-center gap-4">
        {!compact && (
          <div className="grid size-20 place-items-center rounded-full border border-line bg-background">
            <span className="size-3 rounded-full bg-accent motion-safe:animate-pulse" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
        </div>
        <p className="rounded-full border border-line bg-background px-4 py-2 font-mono text-sm font-semibold">
          {metric}
        </p>
      </div>
    </div>
  );
}

function Leaderboard({ entries }: { entries: PublicQuizState["leaderboard"] }) {
  if (entries.length === 0) {
    return (
      <CenteredState
        title="No leaderboard yet"
        body="Scores will appear after answers come in."
        metric="Top 10"
        compact
      />
    );
  }

  return (
    <div className="rounded-[8px] border border-line bg-background p-4">
      <h2 className="text-sm font-semibold text-foreground">Top 10</h2>
      <ol className="mt-3 flex flex-col gap-2">
        {entries.map((entry) => (
          <li
            key={entry.participantId}
            className="flex items-center justify-between rounded-[8px] border border-line bg-surface px-3 py-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <RankIcon rank={entry.rank} />
              <span className="truncate">
                #{entry.rank} {entry.displayName}
              </span>
            </span>
            <span className="font-semibold">{entry.totalScore}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RankIcon({ rank }: { rank: number }) {
  const icon =
    rank === 1
      ? "noto:1st-place-medal"
      : rank === 2
        ? "noto:2nd-place-medal"
        : rank === 3
          ? "noto:3rd-place-medal"
          : null;
  if (!icon) {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">
        {rank}
      </span>
    );
  }
  return <Icon icon={icon} className="size-7 shrink-0" aria-hidden />;
}

function prettyAnswerError(error: string | undefined) {
  switch (error) {
    case "timeout":
      return "Time is up.";
    case "answer_closed":
      return "Answering is closed for this question.";
    case "not_joined":
      return "You are not in the quiz room yet.";
    case "question_voided":
      return "This question was voided.";
    default:
      return "Could not submit that answer.";
  }
}
