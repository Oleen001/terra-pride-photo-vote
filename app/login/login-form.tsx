"use client";

import { useActionState, useState } from "react";
import type { CSSProperties, Dispatch, FormEvent, SetStateAction } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { stage: "email", email: "" };

type Burst = {
  id: number;
  char: string;
  x: number;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="field-button">
      {pending ? "Working…" : label}
    </button>
  );
}

function TypingBurst({ burst }: { burst: Burst | null }) {
  if (!burst) return null;

  return (
    <span
      key={burst.id}
      className="typing-burst"
      style={{ "--burst-x": `${burst.x}px` } as CSSProperties}
      aria-hidden
    >
      <span className="typing-burst-char">{burst.char}</span>
      {Array.from({ length: 6 }, (_, index) => (
        <span
          key={index}
          className="typing-burst-splash"
          style={
            {
              "--burst-angle": `${index * 60 - 24}deg`,
              "--burst-distance": `${18 + (index % 2) * 8}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [emailBurst, setEmailBurst] = useState<Burst | null>(null);
  const [codeBurst, setCodeBurst] = useState<Burst | null>(null);
  const onCodeStage = state.stage === "code";

  function triggerBurst(
    event: FormEvent<HTMLInputElement>,
    setBurst: Dispatch<SetStateAction<Burst | null>>,
    averageCharWidth: number,
  ) {
    const input = event.currentTarget;
    const inputEvent = event.nativeEvent as InputEvent;
    const char = inputEvent.data ?? input.value.slice(-1);

    if (!char || inputEvent.inputType?.startsWith("delete")) return;

    const cursor = input.selectionStart ?? input.value.length;
    const x = Math.min(
      Math.max(18, 16 + cursor * averageCharWidth),
      input.offsetWidth - 22,
    );

    const id = Date.now();
    setBurst({ id, char: char.slice(-1), x });
    window.setTimeout(() => {
      setBurst((current) => (current?.id === id ? null : current));
    }, 1500);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            required
            readOnly={onCodeStage}
            defaultValue={state.email}
            autoComplete="email"
            placeholder="you@example.com"
            onInput={(event) => triggerBurst(event, setEmailBurst, 7.2)}
            className="field-input"
          />
          <TypingBurst burst={emailBurst} />
        </div>
      </div>

      {onCodeStage && (
        <div className="flex flex-col gap-2">
          <label htmlFor="code" className="text-sm font-medium text-foreground">
            OTP code (sent to your email)
          </label>
          <div className="relative">
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              onInput={(event) => triggerBurst(event, setCodeBurst, 18)}
              className="field-input text-center text-lg tracking-[0.5em]"
            />
            <TypingBurst burst={codeBurst} />
          </div>
        </div>
      )}

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <SubmitButton label={onCodeStage ? "Verify code" : "Send login code"} />

      {onCodeStage && (
        <p className="text-center text-xs text-zinc-500">
          Wrong email?{" "}
          <a href="/login" className="underline hover:text-foreground">
            Start over
          </a>
        </p>
      )}
    </form>
  );
}
