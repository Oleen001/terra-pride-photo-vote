"use client";

import { useRef, useState, useTransition } from "react";
import { addWhitelistAction } from "@/app/admin/actions";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WhitelistAddForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addWhitelistAction(email);
      if (!res.ok) {
        setError(res.error ?? "Couldn't add the email.");
        return;
      }
      inputRef.current?.form?.reset();
      inputRef.current?.focus();
    });
  }

  return (
    <form
      action={onSubmit}
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <label
        htmlFor="whitelist-email"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Add an email to the whitelist
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          id="whitelist-email"
          name="email"
          type="email"
          required
          placeholder="name@example.com"
          autoComplete="off"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 cursor-pointer rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
