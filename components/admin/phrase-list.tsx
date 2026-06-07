"use client";

import { useState, useTransition } from "react";
import { removePhrasesAction } from "@/app/admin/actions";
import { PhraseRemoveButton } from "@/components/admin/phrase-remove-button";
import { TypeIcon, TrashIcon } from "./icons";

type Row = { id: string; text: string; created_at: string };

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});
function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

export function PhraseList({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function bulkDelete() {
    setError(null);
    const ids = [...selected];
    startTransition(async () => {
      const res = await removePhrasesAction(ids);
      if (!res.ok) {
        setError(res.error ?? "Couldn't delete the selected phrases.");
        return;
      }
      setSelected(new Set());
      setConfirming(false);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <TypeIcon className="size-6 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No phrases yet</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Add a phrase above. Until then the graph view falls back to a small
          built-in set.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* toolbar: select-all + bulk delete */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = selected.size > 0 && !allSelected;
            }}
            onChange={toggleAll}
            className="size-4 cursor-pointer accent-zinc-900 dark:accent-white"
          />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>

        {selected.size > 0 &&
          (confirming ? (
            <div className="flex items-center gap-2">
              {error && (
                <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
              )}
              <button
                type="button"
                onClick={bulkDelete}
                disabled={pending}
                className="min-h-9 cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Deleting…" : `Delete ${selected.size}`}
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
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
            >
              <TrashIcon className="size-3.5" />
              Delete selected
            </button>
          ))}
      </div>

      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {rows.map((row) => {
          const checked = selected.has(row.id);
          return (
            <li
              key={row.id}
              className={`flex items-center gap-3 px-4 py-3 transition ${
                checked ? "bg-zinc-50 dark:bg-zinc-800/40" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(row.id)}
                aria-label={`Select "${row.text}"`}
                className="size-4 shrink-0 cursor-pointer accent-zinc-900 dark:accent-white"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {row.text}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Added {formatDate(row.created_at)}
                </p>
              </div>
              <div className="shrink-0">
                <PhraseRemoveButton id={row.id} text={row.text} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
