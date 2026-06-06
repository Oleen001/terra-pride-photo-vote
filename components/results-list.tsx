"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { RankedPhoto } from "@/lib/photos";

export function ResultsList({ photos }: { photos: RankedPhoto[] }) {
  const reduce = useReducedMotion();

  return (
    <ol className="flex flex-col gap-4">
      {photos.map((photo, i) => {
        const rank = i + 1;
        const podium = rank <= 3;
        return (
          <motion.li
            key={photo.id}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: reduce ? 0 : Math.min(i * 0.07, 0.7),
              ease: [0.21, 0.47, 0.32, 0.98],
            }}
            className="flex items-center gap-4 overflow-hidden rounded-[8px] border border-line bg-surface p-3 shadow-[0_10px_35px_rgba(36,28,20,0.06)] sm:gap-5 sm:p-4"
          >
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold tabular-nums sm:h-14 sm:w-14 sm:text-xl ${
                podium
                  ? "bg-foreground text-background"
                  : "bg-foreground/6 text-muted"
              }`}
            >
              {rank}
            </div>

            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[8px] bg-foreground/5 sm:h-24 sm:w-24">
              <Image
                src={photo.thumbnailUrl ?? photo.imageUrl}
                alt={photo.caption}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                {photo.caption}
              </p>
              <p className="mt-1 truncate text-xs text-muted/75">
                {photo.ownerEmail}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end pr-1">
              <span className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                {photo.voteCount}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-muted/75">
                votes
              </span>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
