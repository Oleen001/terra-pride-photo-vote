"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { stage: "email", email: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-[8px] bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:translate-y-[-1px] hover:shadow-md disabled:opacity-50"
    >
      {pending ? "กำลังดำเนินการ…" : label}
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
          อีเมล
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          readOnly={onCodeStage}
          defaultValue={state.email}
          autoComplete="email"
          placeholder="you@example.com"
          className="rounded-[8px] border border-line bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent read-only:bg-foreground/5 read-only:text-muted"
        />
      </div>

      {onCodeStage && (
        <div className="flex flex-col gap-2">
          <label htmlFor="code" className="text-sm font-medium text-foreground">
            รหัส OTP (ส่งไปที่อีเมลแล้ว)
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            placeholder="000000"
            className="rounded-[8px] border border-line bg-background px-4 py-3 text-center text-lg tracking-[0.5em] text-foreground outline-none transition focus:border-accent"
          />
        </div>
      )}

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <SubmitButton label={onCodeStage ? "ยืนยันรหัส" : "ส่งรหัสเข้าสู่ระบบ"} />

      {onCodeStage && (
        <p className="text-center text-xs text-zinc-500">
          กรอกอีเมลผิด?{" "}
          <a href="/login" className="underline hover:text-foreground">
            เริ่มใหม่
          </a>
        </p>
      )}
    </form>
  );
}
