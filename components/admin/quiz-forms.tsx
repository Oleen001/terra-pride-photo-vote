"use client";

import { useActionState, useState, useTransition } from "react";
import type { QuizActionState } from "@/app/admin/quiz/actions";
import {
  createQuizQuestionAction,
  createQuizSetAction,
  deleteQuizQuestionAction,
  endQuizRunAction,
  pauseRunAction,
  resumeRunAction,
  setActiveQuizSetAction,
  setQuizOpenAction,
  startQuestionAction,
  startQuizRunAction,
  toggleLeaderboardAction,
  updateQuizQuestionAction,
  voidQuestionAction,
} from "@/app/admin/quiz/actions";
import type { AdminQuizQuestion, QuizMode } from "@/lib/quiz";

const initialState: QuizActionState = { ok: false };

export function QuizSetForm() {
  const [state, formAction, pending] = useActionState(createQuizSetAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          New quiz set
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create multiple sets, then choose one active set for the event.
        </p>
      </div>
      <input
        name="title"
        placeholder="Set title"
        className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
        required
      />
      <textarea
        name="description"
        placeholder="Optional description"
        className="min-h-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Creating..." : "Create set"}
      </button>
      {state.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      {state.ok && <p className="text-xs text-emerald-600 dark:text-emerald-400">Created.</p>}
    </form>
  );
}

export function QuizQuestionForm({ quizSetId }: { quizSetId: string }) {
  const [state, formAction, pending] = useActionState(
    createQuizQuestionAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <input type="hidden" name="quizSetId" value={quizSetId} />
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Add question
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Four choices, one correct answer. Timer accepts 5-120 seconds.
        </p>
      </div>
      <textarea
        name="prompt"
        placeholder="Question"
        className="min-h-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
        required
      />
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Time limit
        <input
          name="timeLimitSeconds"
          type="number"
          min={5}
          max={120}
          defaultValue={20}
          className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {[1, 2, 3, 4].map((index) => (
          <label
            key={index}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
          >
            <input
              type="radio"
              name="correctIndex"
              value={index}
              defaultChecked={index === 1}
              className="size-4"
            />
            <input
              name={`choice${index}`}
              placeholder={`Choice ${index}`}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              required
            />
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Adding..." : "Add question"}
      </button>
      {state.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      {state.ok && <p className="text-xs text-emerald-600 dark:text-emerald-400">Question added.</p>}
    </form>
  );
}

export function QuizActionButton({
  label,
  pendingLabel,
  action,
  tone = "default",
}: {
  label: string;
  pendingLabel?: string;
  action: () => Promise<QuizActionState>;
  tone?: "default" | "danger" | "quiet" | "brand";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toneClass =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : tone === "brand"
        ? "bg-[#529bc9] text-white hover:bg-[#438dbb]"
      : tone === "quiet"
        ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await action();
            if (!result.ok) setError(result.error ?? "Action failed.");
          });
        }}
        className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold transition disabled:opacity-60 ${toneClass}`}
      >
        {pending ? (pendingLabel ?? "Working...") : label}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

export function QuizEntryToggle({ open }: { open: boolean }) {
  return (
    <QuizActionButton
      label={open ? "Close entry" : "Open entry"}
      pendingLabel="Saving..."
      action={() => setQuizOpenAction(!open)}
      tone={open ? "quiet" : "brand"}
    />
  );
}

export function SetActiveButton({ quizSetId }: { quizSetId: string }) {
  return (
    <QuizActionButton
      label="Set active"
      action={() => setActiveQuizSetAction(quizSetId)}
      tone="quiet"
    />
  );
}

export function StartRunButton({
  quizSetId,
  mode,
}: {
  quizSetId: string;
  mode: QuizMode;
}) {
  return (
    <QuizActionButton
      label={mode === "practice" ? "Start practice" : "Start live"}
      pendingLabel="Starting..."
      action={() => startQuizRunAction(quizSetId, mode)}
      tone={mode === "live" ? "brand" : "default"}
    />
  );
}

export function EndRunButton({ quizSetId }: { quizSetId: string }) {
  return (
    <QuizActionButton
      label="End run"
      pendingLabel="Ending..."
      action={() => endQuizRunAction(quizSetId)}
      tone="danger"
    />
  );
}

export function QuestionControlButtons({
  runId,
  questionId,
  isCurrent,
  voided,
}: {
  runId: string;
  questionId: string;
  isCurrent: boolean;
  voided: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <QuizActionButton
        label={isCurrent ? "Restart question" : "Start question"}
        pendingLabel="Starting..."
        action={() => startQuestionAction(runId, questionId)}
        tone="quiet"
      />
      {!voided && (
        <QuizActionButton
          label="Void"
          pendingLabel="Voiding..."
          action={() => voidQuestionAction(questionId)}
          tone="danger"
        />
      )}
    </div>
  );
}

export function QuizQuestionEditor({ question }: { question: AdminQuizQuestion }) {
  const [state, formAction, pending] = useActionState(
    updateQuizQuestionAction,
    initialState,
  );

  return (
    <details className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <summary className="cursor-pointer text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        Edit question
      </summary>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="questionId" value={question.id} />
        <textarea
          name="prompt"
          defaultValue={question.prompt}
          className="min-h-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#529bc9] dark:border-zinc-800 dark:bg-zinc-900"
          required
        />
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Time limit
          <input
            name="timeLimitSeconds"
            type="number"
            min={5}
            max={120}
            defaultValue={question.timeLimitSeconds}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-[#529bc9] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {question.choices.map((choice, index) => (
            <label
              key={choice.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <input type="hidden" name="choiceId" value={choice.id} />
              <input
                type="radio"
                name="correctChoiceId"
                value={choice.id}
                defaultChecked={choice.isCorrect}
                className="size-4"
              />
              <span className="text-xs font-semibold text-zinc-400">
                {String.fromCharCode(65 + index)}
              </span>
              <input
                name={`choiceLabel:${choice.id}`}
                defaultValue={choice.label}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                required
              />
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-[#529bc9] px-3 text-xs font-semibold text-white transition hover:bg-[#438dbb] disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save question"}
        </button>
        {state.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
        {state.ok && <p className="text-xs text-emerald-600 dark:text-emerald-400">Saved.</p>}
      </form>
    </details>
  );
}

export function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-100 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <QuizActionButton
        label="Confirm delete"
        pendingLabel="Deleting..."
        action={() => deleteQuizQuestionAction(questionId)}
        tone="danger"
      />
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-100 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      >
        Cancel
      </button>
    </div>
  );
}

export function RunPauseButton({
  runId,
  state,
}: {
  runId: string;
  state: "lobby" | "question_active" | "paused" | "question_ended" | "ended";
}) {
  if (state === "question_active") {
    return (
      <QuizActionButton
        label="Pause"
        pendingLabel="Pausing..."
        action={() => pauseRunAction(runId)}
        tone="quiet"
      />
    );
  }
  if (state === "paused") {
    return (
      <QuizActionButton
        label="Resume"
        pendingLabel="Resuming..."
        action={() => resumeRunAction(runId)}
      />
    );
  }
  return null;
}

export function LeaderboardToggleButton({
  runId,
  hidden,
}: {
  runId: string;
  hidden: boolean;
}) {
  return (
    <QuizActionButton
      label={hidden ? "Show leaderboard" : "Hide leaderboard"}
      action={() => toggleLeaderboardAction(runId, !hidden)}
      tone="quiet"
    />
  );
}
