"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { GalleryPhoto } from "@/lib/photos";
import { VoteButton } from "@/components/vote-button";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { ImageIcon } from "@/components/icons";
import { voteAction, unvoteAction } from "@/app/actions/vote";

type GalleryProps = {
  photos: GalleryPhoto[];
  initialVotedIds: string[];
  votingOpen: boolean;
  loggedIn: boolean;
  currentUserId: string | null;
};

export function Gallery({
  photos: initialPhotos,
  initialVotedIds,
  votingOpen,
  loggedIn,
  currentUserId,
}: GalleryProps) {
  const reduce = useReducedMotion();
  const [photos, setPhotos] = useState(initialPhotos);
  const [votedIds, setVotedIds] = useState<Set<string>>(() => new Set(initialVotedIds));
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const isOwner = useCallback(
    (p: GalleryPhoto) => currentUserId !== null && p.ownerUserId === currentUserId,
    [currentUserId],
  );

  const setPending = useCallback((id: string, on: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleVote = useCallback(
    (photo: GalleryPhoto) => {
      if (isOwner(photo) || !loggedIn || !votingOpen) return;
      const id = photo.id;
      if (pendingIds.has(id)) return; // guard against double-fire while in flight
      const wasVoted = votedIds.has(id);

      // optimistic
      setVotedIds((prev) => {
        const next = new Set(prev);
        if (wasVoted) next.delete(id);
        else next.add(id);
        return next;
      });
      setPending(id, true);

      const run = wasVoted ? unvoteAction : voteAction;
      run(id)
        .then((res) => {
          if (!res.ok) {
            // reconcile: revert
            setVotedIds((prev) => {
              const next = new Set(prev);
              if (wasVoted) next.add(id);
              else next.delete(id);
              return next;
            });
          }
        })
        .catch(() => {
          setVotedIds((prev) => {
            const next = new Set(prev);
            if (wasVoted) next.add(id);
            else next.delete(id);
            return next;
          });
        })
        .finally(() => setPending(id, false));
    },
    [isOwner, loggedIn, votingOpen, votedIds, pendingIds, setPending],
  );

  const handleDeleted = useCallback((id: string) => {
    setActiveId(null);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const activePhoto = useMemo(
    () => photos.find((p) => p.id === activeId) ?? null,
    [photos, activeId],
  );

  if (photos.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-32 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600">
          <ImageIcon className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          ยังไม่มีรูปภาพ
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          แกลเลอรียังว่างอยู่ เมื่อมีคนอัปโหลดรูป จะปรากฏที่นี่
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-4">
        {photos.map((photo, i) => {
          const owner = isOwner(photo);
          const voted = owner || votedIds.has(photo.id);
          return (
            <motion.figure
              key={photo.id}
              className="group relative block break-inside-avoid overflow-hidden rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-900"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: reduce ? 0 : Math.min(i * 0.035, 0.5),
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
            >
              <button
                type="button"
                onClick={() => setActiveId(photo.id)}
                className="block w-full cursor-pointer text-left"
                aria-label={`Open ${photo.caption}`}
              >
                <div className="relative overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                  <Image
                    src={photo.thumbnailUrl ?? photo.imageUrl}
                    alt={photo.caption}
                    width={600}
                    height={800}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="h-auto w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/55 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
              </button>

              <figcaption className="flex items-start justify-between gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-snug text-zinc-800 dark:text-zinc-200">
                    {photo.caption}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-400 dark:text-zinc-500">
                    {photo.ownerEmail}
                  </p>
                </div>
                <div className="shrink-0">
                  <VoteButton
                    voted={voted}
                    isOwner={owner}
                    votingOpen={votingOpen}
                    loggedIn={loggedIn}
                    pending={pendingIds.has(photo.id)}
                    onToggle={() => toggleVote(photo)}
                  />
                </div>
              </figcaption>
            </motion.figure>
          );
        })}
      </div>

      <PhotoLightbox
        photo={activePhoto}
        voted={
          activePhoto
            ? isOwner(activePhoto) || votedIds.has(activePhoto.id)
            : false
        }
        isOwner={activePhoto ? isOwner(activePhoto) : false}
        votingOpen={votingOpen}
        loggedIn={loggedIn}
        votePending={activePhoto ? pendingIds.has(activePhoto.id) : false}
        onClose={() => setActiveId(null)}
        onToggleVote={() => activePhoto && toggleVote(activePhoto)}
        onDeleted={handleDeleted}
      />
    </>
  );
}
