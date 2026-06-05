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
      className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
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
        <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900 read-only:bg-zinc-100 read-only:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400 dark:read-only:bg-zinc-800"
        />
      </div>

      {onCodeStage && (
        <div className="flex flex-col gap-2">
          <label htmlFor="code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-center text-lg tracking-[0.5em] outline-none transition focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
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
          <a href="/login" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            เริ่มใหม่
          </a>
        </p>
      )}
    </form>
  );
}
