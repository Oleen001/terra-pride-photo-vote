"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HeartIcon, LockIcon } from "@/components/icons";

type VoteButtonProps = {
  voted: boolean;
  isOwner: boolean;
  votingOpen: boolean;
  loggedIn: boolean;
  pending?: boolean;
  size?: "sm" | "lg";
  onToggle: () => void;
};

export function VoteButton({
  voted,
  isOwner,
  votingOpen,
  loggedIn,
  pending,
  size = "sm",
  onToggle,
}: VoteButtonProps) {
  const reduce = useReducedMotion();

  const lg = size === "lg";
  const iconSize = lg ? "h-5 w-5" : "h-4 w-4";
  const pad = lg ? "h-11 px-5 text-sm" : "h-9 px-3.5 text-[13px]";

  // Not logged in → prompt sign in.
  if (!loggedIn) {
    return (
      <a
        href="/login"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white/90 font-medium text-zinc-700 backdrop-blur transition-colors duration-200 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:text-white ${pad}`}
      >
        <HeartIcon className={iconSize} />
        Sign in to vote
      </a>
    );
  }

  // Owner → locked, always voted.
  if (isOwner) {
    return (
      <span
        onClick={(e) => e.stopPropagation()}
        title="คุณโหวตรูปของตัวเองโดยอัตโนมัติ (ยกเลิกไม่ได้)"
        className={`inline-flex cursor-default items-center gap-2 rounded-full bg-rose-500/90 font-medium text-white ${pad}`}
      >
        <HeartIcon className={iconSize} filled />
        <LockIcon className={lg ? "h-4 w-4" : "h-3.5 w-3.5"} />
      </span>
    );
  }

  // Voting closed → disabled hint.
  if (!votingOpen) {
    return (
      <span
        onClick={(e) => e.stopPropagation()}
        title="ขณะนี้ปิดการโหวต"
        className={`inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-zinc-200 bg-white/80 font-medium text-zinc-400 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-600 ${pad}`}
      >
        <HeartIcon className={iconSize} filled={voted} />
        {voted ? "Voted" : "Voting closed"}
      </span>
    );
  }

  return (
    <motion.button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        if (pending) return;
        onToggle();
      }}
      whileTap={reduce ? undefined : { scale: 0.92 }}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full font-medium backdrop-blur transition-colors duration-200 disabled:opacity-70 ${pad} ${
        voted
          ? "bg-rose-500 text-white hover:bg-rose-600"
          : "border border-zinc-200 bg-white/90 text-zinc-700 hover:border-rose-300 hover:text-rose-600 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:border-rose-500/60 dark:hover:text-rose-400"
      }`}
      aria-pressed={voted}
      aria-label={voted ? "Remove vote" : "Vote for this photo"}
    >
      <motion.span
        key={voted ? "on" : "off"}
        initial={reduce ? false : { scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
      >
        <HeartIcon className={iconSize} filled={voted} />
      </motion.span>
      {voted ? "Voted" : "Vote"}
    </motion.button>
  );
}
