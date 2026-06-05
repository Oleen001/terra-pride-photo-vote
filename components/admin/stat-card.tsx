import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: number;
  hint?: string;
  icon?: ReactNode;
  accent?: "default" | "positive" | "danger";
};

const accentText: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-zinc-900 dark:text-zinc-50",
  positive: "text-emerald-600 dark:text-emerald-400",
  danger: "text-red-600 dark:text-red-400",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "default",
}: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        {icon && (
          <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <span
        className={`text-3xl font-semibold tabular-nums tracking-tight ${accentText[accent]}`}
      >
        {value.toLocaleString()}
      </span>
      {hint && (
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</span>
      )}
    </div>
  );
}
