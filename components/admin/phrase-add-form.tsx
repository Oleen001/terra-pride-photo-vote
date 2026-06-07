"use client";

import { useRef, useState, useTransition } from "react";
import { addPhraseAction } from "@/app/admin/actions";
import { BurstInput } from "@/components/burst-input";

const MAX_LEN = 60;

export function PhraseAddForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(formData: FormData) {
    const text = String(formData.get("text") ?? "").trim().replace(/\s+/g, " ");
    if (text.length === 0) {
      setError("Please enter a phrase.");
      return;
    }
    if (text.length > MAX_LEN) {
      setError(`Phrase must be ${MAX_LEN} characters or fewer.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addPhraseAction(text);
      if (!res.ok) {
        setError(res.error ?? "Couldn't add the phrase.");
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
        htmlFor="phrase-text"
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Add a typewriter phrase
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <BurstInput
          ref={inputRef}
          id="phrase-text"
          name="text"
          type="text"
          required
          maxLength={MAX_LEN}
          placeholder="Capture the moment"
          autoComplete="off"
          wrapperClassName="flex-1"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 cursor-pointer rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Up to {MAX_LEN} characters. Shown in the graph view center text.
      </p>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
