"use client";

import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";
import type { PublicQuizState } from "@/lib/quiz";

type LiveQuizStageProps = {
  initialState: PublicQuizState;
};

const beatBars = [0, 1, 2, 3, 4, 5];

export function LiveQuizStage({ initialState }: LiveQuizStageProps) {
  const [state, setState] = useState(initialState);
  const [origin, setOrigin] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const remaining = useRemainingSeconds(state);
  const joinUrl = `${origin || "https://terra-pride.up.railway.app"}/quiz`;

  useEffect(() => {
    let active = true;
    const originTimer = window.setTimeout(() => {
      if (active) setOrigin(window.location.origin);
    }, 0);
    const tick = async () => {
      try {
        const response = await fetch("/api/quiz/state", { cache: "no-store" });
        if (response.ok && active) setState(await response.json());
      } catch {
        // TV view keeps the last good state during brief network drops.
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      active = false;
      window.clearTimeout(originTimer);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!soundOn || state.run?.state !== "question_active" || remaining <= 0) return;
    const context =
      audioContextRef.current ??
      new AudioContext({ latencyHint: "interactive" });
    audioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = remaining <= 5 ? "square" : "sine";
    oscillator.frequency.value = remaining <= 5 ? 660 : 330;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
  }, [remaining, soundOn, state.run?.state]);

  const screen = screenState(state);

  return (
    <main className="fixed inset-0 z-50 overflow-auto bg-background text-foreground">
      <div className="h-1.5 bg-[linear-gradient(90deg,#e4345d,#f59e0b,#f6d84b,#159a6c,#1686d9,#7c3aed)]" />
      <section className="mx-auto grid min-h-[calc(100dvh-6px)] w-full max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="flex min-h-[620px] flex-col gap-8 rounded-[8px] border border-line bg-surface p-6 shadow-[0_18px_46px_rgba(39,32,24,0.08)] lg:p-8">
          {state.question && state.run?.state !== "lobby" && state.run?.state !== "closed" ? (
            <>
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="font-mono text-sm font-semibold uppercase tracking-[0.22em] text-[#529bc9]">
                    Question {state.question.position}
                  </p>
                  <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                    {state.question.prompt}
                  </h1>
                </div>
                <div className="grid size-24 shrink-0 place-items-center rounded-full border border-line bg-foreground text-4xl font-semibold tabular-nums text-background sm:size-28">
                  {remaining}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {state.choices.map((choice, index) => {
                  const isCorrect = state.showAnswer && choice.isCorrect;
                  return (
                    <div
                      key={choice.id}
                      className={`flex min-h-28 items-center gap-4 rounded-[8px] border p-5 ${isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" : "border-line bg-background text-foreground"}`}
                    >
                      <span
                        className={`grid size-14 shrink-0 place-items-center rounded-full font-mono text-xl font-bold ${
                          isCorrect
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-2xl font-semibold">{choice.label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid min-h-[560px] place-items-center text-center">
              <div className="max-w-3xl">
                <p className="font-mono text-sm font-semibold uppercase tracking-[0.22em] text-[#529bc9]">
                  Terra Pride Quiz
                </p>
                <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-7xl">
                  {screen.title}
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-xl leading-8 text-muted">
                  {screen.body}
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <div className="rounded-[8px] border border-line bg-surface p-5 text-foreground shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted">Scan to join</p>
                <p className="mt-1 font-mono text-sm font-bold">{joinUrl}</p>
              </div>
              {state.run?.joinCode && (
                <p className="rounded-full bg-[#529bc9]/10 px-3 py-1 font-mono text-sm font-semibold tracking-[0.16em] text-[#347da9]">
                  {state.run.joinCode}
                </p>
              )}
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=18&data=${encodeURIComponent(joinUrl)}`}
              alt="QR code to join the quiz"
              className="mt-5 aspect-square w-full rounded-[8px] bg-zinc-100 p-4"
            />
          </div>

          <div className="rounded-[8px] border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted">Submitted</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums">
                  {state.answersReceived}/{state.participantsReady}
                </p>
              </div>
              <BeatMeter remaining={remaining} active={state.run?.state === "question_active"} />
            </div>
            <button
              type="button"
              onClick={() => setSoundOn((current) => !current)}
              className="mt-4 inline-flex h-9 items-center rounded-[8px] bg-foreground px-3 text-xs font-semibold text-background"
            >
              {soundOn ? "Sound on" : "Enable sound"}
            </button>
          </div>

          <div className="rounded-[8px] border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Joined</h2>
              <span className="rounded-full bg-background px-2 py-1 text-xs font-semibold text-muted">
                {state.participants.length}
              </span>
            </div>
            <ol className="mt-3 grid max-h-52 grid-cols-2 gap-2 overflow-auto pr-1">
              {state.participants.map((participant) => (
                <li
                  key={participant.id}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-[8px] border border-line bg-background px-3 py-2 text-sm"
                >
                  <span className="truncate font-semibold">{participant.displayName}</span>
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      participant.answeredCurrentQuestion ? "bg-emerald-500" : "bg-[#529bc9]"
                    }`}
                    aria-label={participant.answeredCurrentQuestion ? "answered" : "joined"}
                  />
                </li>
              ))}
              {state.participants.length === 0 && (
                <li className="col-span-2 text-sm text-muted">No players yet</li>
              )}
            </ol>
          </div>

          {state.showAnswer && (
            <div className="rounded-[8px] border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Answer breakdown</h2>
                <span className="rounded-full bg-background px-2 py-1 text-xs font-semibold text-muted">
                  This question
                </span>
              </div>
              <ol className="mt-3 flex max-h-60 flex-col gap-2 overflow-auto pr-1">
                {state.participants.map((participant) => (
                  <li
                    key={participant.id}
                    className={`grid grid-cols-[1fr_auto] gap-2 rounded-[8px] border px-3 py-2 text-sm ${
                      participant.currentIsCorrect
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100"
                        : "border-line bg-background text-foreground"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{participant.displayName}</p>
                      <p className="truncate text-xs text-muted">
                        {participant.selectedChoiceLabel
                          ? `${choiceLetter(participant.selectedChoicePosition)} ${participant.selectedChoiceLabel}`
                          : "No answer"}
                      </p>
                    </div>
                    <div className="text-right font-mono text-sm font-semibold">
                      {participant.currentScore ?? 0}
                    </div>
                  </li>
                ))}
                {state.participants.length === 0 && (
                  <li className="text-sm text-muted">No players yet</li>
                )}
              </ol>
            </div>
          )}

          <ol className="flex flex-col gap-3 rounded-[8px] border border-line bg-surface p-5 shadow-sm">
            {state.leaderboard.slice(0, 10).map((entry) => (
              <li
                key={entry.participantId}
                className="grid grid-cols-[36px_1fr_auto] items-center gap-3"
              >
                <RankIcon rank={entry.rank} />
                <span className="truncate text-sm font-semibold">{entry.displayName}</span>
                <span className="font-mono text-sm text-muted">
                  {entry.totalScore.toLocaleString()}
                </span>
              </li>
            ))}
            {state.leaderboard.length === 0 && (
              <li className="text-sm text-muted">
                {state.run?.hideLeaderboard ? "Leaderboard hidden" : "No scores yet"}
              </li>
            )}
          </ol>
        </aside>
      </section>
    </main>
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
      <span className="grid size-9 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
        {rank}
      </span>
    );
  }
  return (
    <span className="grid size-9 place-items-center">
      <Icon icon={icon} className="size-8" aria-hidden />
    </span>
  );
}

function choiceLetter(position: number | null) {
  if (!position || position < 1) return "";
  return `${String.fromCharCode(64 + position)}.`;
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

function BeatMeter({ remaining, active }: { remaining: number; active: boolean }) {
  const activeBar = active ? remaining % beatBars.length : -1;

  return (
    <div className="flex h-16 items-end gap-1.5" aria-label="Beat meter">
      {beatBars.map((bar) => (
        <span
          key={bar}
          className={`w-3 rounded-full transition-all duration-200 ${
            bar === activeBar ? "bg-[#f6d84b]" : "bg-foreground/18"
          }`}
          style={{ height: `${22 + ((bar + remaining) % 4) * 10}px` }}
        />
      ))}
    </div>
  );
}

function screenState(state: PublicQuizState) {
  if (!state.quizOpen) {
    return {
      title: "Quiz is closed",
      body: "The organizer will open the quiz entry when everyone is ready.",
    };
  }
  if (!state.activeSet) {
    return {
      title: "Preparing quiz",
      body: "An active quiz set has not been selected yet.",
    };
  }
  if (!state.run || state.run.state === "lobby" || state.run.state === "closed") {
    return {
      title: "Scan to join",
      body: "Open the quiz on your phone and wait for the first question.",
    };
  }
  if (state.run.state === "paused") {
    return {
      title: "Paused",
      body: "Answers are closed while the organizer pauses the round.",
    };
  }
  return {
    title: "Quiz ended",
    body: "Thanks for playing Terra Pride Quiz.",
  };
}
