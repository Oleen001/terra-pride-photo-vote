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
        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface/92 font-medium text-foreground shadow-sm backdrop-blur transition duration-200 hover:-translate-y-px hover:border-foreground/20 ${pad}`}
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
        title="Your own photo is voted automatically (can't be removed)"
        className={`inline-flex cursor-default items-center gap-2 rounded-full bg-accent font-medium text-white shadow-sm ${pad}`}
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
        title="Voting is closed right now"
        className={`inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-line bg-surface/80 font-medium text-muted/55 backdrop-blur ${pad}`}
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
          ? "bg-accent text-white shadow-sm hover:bg-accent/90"
          : "border border-line bg-surface/92 text-foreground shadow-sm hover:-translate-y-px hover:border-accent/40 hover:text-accent"
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
