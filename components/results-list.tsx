"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { HeartIcon, TrophyIcon } from "@/components/icons";
import type { RankedPhoto } from "@/lib/photos";

export function ResultsList({ photos }: { photos: RankedPhoto[] }) {
  const reduce = useReducedMotion();
  const [winner, ...rest] = photos;

  if (!winner) return null;

  return (
    <ol className="grid gap-5 sm:gap-6 lg:grid-cols-2">
      <motion.li
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.58,
          ease: [0.21, 0.47, 0.32, 0.98],
        }}
        className="group relative grid overflow-hidden rounded-[8px] border border-line bg-surface shadow-[0_22px_70px_rgba(36,28,20,0.14)] md:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)] lg:col-span-2"
      >
        <div className="relative min-h-[420px] overflow-hidden bg-foreground/5 sm:min-h-[520px] md:min-h-[560px]">
          <Image
            src={winner.imageUrl}
            alt={winner.caption}
            fill
            priority
            quality={92}
            sizes="(min-width: 768px) 58vw, 100vw"
            className="object-cover transition duration-700 group-hover:scale-[1.025]"
          />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/74 to-transparent md:hidden" />
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-[8px] bg-foreground px-3 py-2 text-background shadow-sm">
            <TrophyIcon className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">
              Rank 1
            </span>
          </div>
        </div>

        <div className="relative flex min-h-[300px] flex-col justify-between p-5 sm:p-7 md:p-8">
          <div>
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                Winner
              </p>
              <VoteCount count={winner.voteCount} featured />
            </div>
            <h2 className="max-w-xl text-2xl font-semibold leading-tight text-foreground sm:text-4xl">
              {winner.caption}
            </h2>
            <p className="mt-4 text-sm font-medium text-muted">
              {displayNameFromEmail(winner.ownerEmail)}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 border-t border-line pt-5 text-center">
            <Stat label="rank" value="#1" />
            <Stat label="votes" value={String(winner.voteCount)} />
            <Stat label="field" value={`/${photos.length}`} />
          </div>
        </div>
      </motion.li>

      {rest.map((photo, i) => {
        const rank = i + 2;
        const podium = rank <= 3;
        return (
          <motion.li
            key={photo.id}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: reduce ? 0 : Math.min((i + 1) * 0.06, 0.7),
              ease: [0.21, 0.47, 0.32, 0.98],
            }}
            className="flex min-w-0 items-center gap-3 overflow-hidden rounded-[8px] border border-line bg-surface/90 p-3 shadow-[0_10px_35px_rgba(36,28,20,0.06)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(36,28,20,0.11)] sm:gap-4 sm:p-4"
          >
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-base font-bold tabular-nums sm:h-12 sm:w-12 sm:text-lg ${
                podium
                  ? "bg-foreground text-background"
                  : "bg-foreground/6 text-muted"
              }`}
            >
              {rank}
            </div>

            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[8px] bg-foreground/5 sm:h-20 sm:w-20">
              <Image
                src={photo.thumbnailUrl ?? photo.imageUrl}
                alt={photo.caption}
                fill
                quality={92}
                sizes="80px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {photo.caption}
              </p>
              <p className="mt-1 truncate text-xs text-muted/75">
                {displayNameFromEmail(photo.ownerEmail)}
              </p>
            </div>

            <VoteCount count={photo.voteCount} />
          </motion.li>
        );
      })}
    </ol>
  );
}

function VoteCount({ count, featured = false }: { count: number; featured?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-[8px] border border-line bg-background/72 px-3 py-2 shadow-sm">
      <HeartIcon filled className={featured ? "h-4 w-4 text-accent" : "h-3.5 w-3.5 text-accent"} />
      <div className="flex flex-col items-end leading-none">
        <span className={`${featured ? "text-xl" : "text-lg"} font-semibold tabular-nums text-foreground`}>
          {count}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted/75">
          votes
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted/70">{label}</p>
    </div>
  );
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local.replace(/[._-]+/g, " ").trim() || "Terra teammate";
}
