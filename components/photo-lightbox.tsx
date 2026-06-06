"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { GalleryPhoto } from "@/lib/photos";
import { VoteButton } from "@/components/vote-button";
import { CloseIcon, TrashIcon } from "@/components/icons";
import { deleteOwnPhotoAction } from "@/app/actions/photos";

type PhotoLightboxProps = {
  photo: GalleryPhoto | null;
  voted: boolean;
  isOwner: boolean;
  votingOpen: boolean;
  loggedIn: boolean;
  votePending: boolean;
  onClose: () => void;
  onToggleVote: () => void;
  onDeleted: (photoId: string) => void;
};

export function PhotoLightbox({
  photo,
  voted,
  isOwner,
  votingOpen,
  loggedIn,
  votePending,
  onClose,
  onToggleVote,
  onDeleted,
}: PhotoLightboxProps) {
  const reduce = useReducedMotion();
  const [deleteState, setDeleteState] = useState<{
    photoId: string;
    confirm: boolean;
    error: string | null;
  }>({ photoId: "", confirm: false, error: null });
  const [deleting, startDelete] = useTransition();
  const confirmDelete = photo ? deleteState.photoId === photo.id && deleteState.confirm : false;
  const deleteError = photo && deleteState.photoId === photo.id ? deleteState.error : null;

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [photo, onClose]);

  function handleDelete() {
    if (!photo) return;
    startDelete(async () => {
      const res = await deleteOwnPhotoAction(photo.id);
      if (res.ok) {
        onDeleted(photo.id);
      } else {
        setDeleteState({
          photoId: photo.id,
          confirm: true,
          error: res.error ?? "Couldn't delete the photo.",
        });
      }
    });
  }

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Photo detail"
        >
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors duration-200 hover:bg-white/20"
          >
            <CloseIcon className="h-5 w-5" />
          </button>

          <motion.div
            className="relative z-10 flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[8px] bg-surface shadow-2xl md:flex-row"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex min-h-[40vh] flex-1 items-center justify-center bg-foreground/5 md:max-h-[85vh]">
              <Image
                src={photo.imageUrl}
                alt={photo.caption}
                width={1400}
                height={1400}
                sizes="(max-width: 768px) 100vw, 70vw"
                className="h-auto max-h-[50vh] w-auto max-w-full object-contain md:max-h-[85vh]"
                priority
              />
            </div>

            <div className="flex w-full shrink-0 flex-col gap-5 p-6 md:w-80 md:border-l md:border-line">
              <div className="flex flex-col gap-2">
                <p className="text-base leading-relaxed text-foreground">
                  {photo.caption}
                </p>
                <p className="truncate text-xs text-muted">
                  {photo.uploaderName}
                </p>
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <VoteButton
                  voted={voted}
                  isOwner={isOwner}
                  votingOpen={votingOpen}
                  loggedIn={loggedIn}
                  pending={votePending}
                  size="lg"
                  onToggle={onToggleVote}
                />

                {isOwner && (
                  <div className="flex flex-col gap-2 border-t border-line pt-3">
                    {!confirmDelete ? (
                      <button
                        type="button"
                        onClick={() => setDeleteState({ photoId: photo.id, confirm: true, error: null })}
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[8px] text-[13px] font-medium text-muted transition-colors duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete photo
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="text-[13px] text-muted">
                          Delete this photo? This can&apos;t be undone on your end.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={handleDelete}
                            className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-[8px] bg-red-600 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-red-700 disabled:opacity-60"
                          >
                            {deleting ? "Deleting…" : "Confirm delete"}
                          </button>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => setDeleteState({ photoId: photo.id, confirm: false, error: null })}
                            className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-[8px] border border-line text-[13px] font-medium text-foreground transition-colors duration-200 hover:bg-foreground/5"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {deleteError && (
                      <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
