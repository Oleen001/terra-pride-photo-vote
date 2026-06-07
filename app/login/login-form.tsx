"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";
import { BurstInput } from "@/components/burst-input";

const initialState: LoginState = { stage: "email", email: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="field-button">
      {pending ? "Working…" : label}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const onCodeStage = state.stage === "code";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <BurstInput
          id="email"
          name="email"
          type="email"
          required
          readOnly={onCodeStage}
          defaultValue={state.email}
          autoComplete="email"
          placeholder="you@example.com"
          averageCharWidth={7.2}
          className="field-input"
        />
      </div>

      {onCodeStage && (
        <div className="flex flex-col gap-2">
          <label htmlFor="code" className="text-sm font-medium text-foreground">
            OTP code (sent to your email)
          </label>
          <BurstInput
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            placeholder="000000"
            averageCharWidth={18}
            className="field-input text-center text-lg tracking-[0.5em]"
          />
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
