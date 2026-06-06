"use client";

import { useState, useTransition } from "react";
import {
  adminDeletePhotoAction,
  adminRestorePhotoAction,
} from "@/app/admin/actions";
import { RestoreIcon, TrashIcon } from "./icons";

export function PhotoActionButton({
  photoId,
  isDeleted,
}: {
  photoId: string;
  isDeleted: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const res = isDeleted
        ? await adminRestorePhotoAction(photoId)
        : await adminDeletePhotoAction(photoId);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
      }
      setConfirming(false);
    });
  }

  if (isDeleted) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <RestoreIcon className="size-3.5" />
          {pending ? "Restoring…" : "Restore"}
        </button>
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        )}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Confirm delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
    >
      <TrashIcon className="size-3.5" />
      Delete
    </button>
  );
}
