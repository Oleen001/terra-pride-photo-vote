"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";
import { BurstInput } from "@/components/burst-input";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="field-button">
      {pending ? "Working…" : label}
    </button>
  );
}

export function LoginForm({ next = "/" }: { next?: string }) {
  const initialState: LoginState = { email: "", next };
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={state.next} />
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <BurstInput
          id="email"
          name="email"
          type="email"
          required
          defaultValue={state.email}
          autoComplete="email"
          placeholder="you@example.com"
          averageCharWidth={7.2}
          className="field-input"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <SubmitButton label="Sign in" />
    </form>
  );
}
