"use client";

import { useState, useTransition } from "react";
import { updateSettingsAction } from "@/app/admin/actions";
import type { AppSettings } from "@/lib/settings";

type SettingKey = keyof AppSettings;

type SettingsToggleProps = {
  settingKey: SettingKey;
  label: string;
  description: string;
  initial: boolean;
  warning?: string;
};

export function SettingsToggle({
  settingKey,
  label,
  description,
  initial,
  warning,
}: SettingsToggleProps) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const res = await updateSettingsAction({ [settingKey]: next });
      if (!res.ok) {
        setOn(!next);
        setError(res.error ?? "บันทึกไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {label}
            </h3>
            {pending && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                กำลังบันทึก…
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={label}
          disabled={pending}
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900 ${
            on
              ? "bg-emerald-500"
              : "bg-zinc-200 dark:bg-zinc-700"
          }`}
        >
          <span
            className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform dark:bg-zinc-50 ${
              on ? "translate-x-6" : "translate-x-1"
            }`}
            aria-hidden
          />
        </button>
      </div>

      {warning && on && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          {warning}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
