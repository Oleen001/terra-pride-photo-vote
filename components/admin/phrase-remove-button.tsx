"use client";

import { useState, useTransition } from "react";
import { removePhraseAction } from "@/app/admin/actions";
import { TrashIcon } from "./icons";

export function PhraseRemoveButton({
  id,
  text,
}: {
  id: string;
  text: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await removePhraseAction(id);
      if (!res.ok) {
        setError(res.error ?? "Couldn't remove the phrase.");
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="min-h-9 cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Removing…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="min-h-9 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Remove the phrase "${text}"`}
      className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
    >
      <TrashIcon className="size-3.5" />
      Remove
    </button>
  );
}
