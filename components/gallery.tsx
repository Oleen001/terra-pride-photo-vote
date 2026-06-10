"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import type { GalleryPhoto } from "@/lib/photos";
import { ImageIcon } from "@/components/icons";
import { ThreeHeartButton } from "@/components/three-heart-button";
import { ForceGallery } from "@/components/force-gallery";
import { PhraseSubmit } from "@/components/phrase-submit";
import { PhotoModal } from "@/components/photo-modal";
import { unvoteAction, voteAction } from "@/app/actions/vote";
import { deleteOwnPhotoAction, getActivePhotosAction } from "@/app/actions/photos";

type GalleryProps = {
  photos: GalleryPhoto[];
  initialVotedIds: string[];
  votingOpen: boolean;
  loggedIn: boolean;
  currentUserId: string | null;
  phrases: string[];
};

const masonrySpans = [10, 13, 9, 12, 15, 11, 14, 10, 12, 16, 9, 13];

function pickAmbientZoomIds(photos: GalleryPhoto[], count: number): Set<string> {
  if (photos.length <= count) return new Set(photos.map((photo) => photo.id));

  const pool = photos.map((photo) => photo.id);
  const picked = new Set<string>();
  while (picked.size < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const [id] = pool.splice(index, 1);
    if (id) picked.add(id);
  }
  return picked;
}

export function Gallery({
  photos: initialPhotos,
  initialVotedIds,
  votingOpen,
  loggedIn,
  currentUserId,
  phrases,
}: GalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [view, setView] = useState<"board" | "graph">("board");

  // Stable layout slot per photo id: a photo keeps the slot it was first seen with,
  // so the 8s poll (which prepends newest-first) never teleports existing cards.
  // The slot map is grown only inside the same updater that changes `photos`
  // (event-driven, not in render), so order changes don't reshuffle the board.
  const [slotMap, setSlotMap] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    initialPhotos.forEach((p, i) => map.set(p.id, i));
    return map;
  });
  const ensureSlots = useCallback((list: GalleryPhoto[]) => {
    setSlotMap((prev) => {
      let next: Map<string, number> | null = null;
      let count = prev.size;
      for (const photo of list) {
        if (!prev.has(photo.id)) {
          if (!next) next = new Map(prev);
          next.set(photo.id, count);
          count += 1;
        }
      }
      return next ?? prev;
    });
  }, []);

  // Live polling: pull active photos every 8s so new uploads appear without a
  // manual refresh (for the event TV). Only updates state when the set changed.
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const fresh = await getActivePhotosAction();
        let changed = false;
        setPhotos((prev) => {
          if (fresh.length === prev.length) {
            const prevIds = new Set(prev.map((p) => p.id));
            if (fresh.every((p) => prevIds.has(p.id))) {
              return prev;
            }
          }
          changed = true;
          return fresh;
        });
        if (changed) ensureSlots(fresh);
      } catch {
        /* ignore transient poll errors */
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [ensureSlots]);

  // Mark <body> while the gallery is mounted so the body-level dot field
  // (body[data-bg="gallery"]::after) paints only on this page. The dot field
  // lives at body level (under the dragon) instead of on the board/graph
  // container so the ambient dragon can glow over the dots, under the photos.
  useEffect(() => {
    document.body.dataset.bg = "gallery";
    return () => {
      // Only clear if we're still the one that set it, so the dot field
      // never leaks onto login/upload/admin after navigation.
      if (document.body.dataset.bg === "gallery") delete document.body.dataset.bg;
    };
  }, []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(() => new Set(initialVotedIds));
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [ambientZoomIds, setAmbientZoomIds] = useState<Set<string>>(() => new Set());
  const boardRef = useRef<HTMLElement | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectPhoto = useCallback((id: string | null) => {
    setConfirmDeleteId(null);
    setSelectedId(id);
  }, []);

  const selectedPhoto = useMemo(
    () => photos.find((photo) => photo.id === selectedId) ?? null,
    [photos, selectedId],
  );

  const isOwner = useCallback(
    (photo: GalleryPhoto) => currentUserId !== null && photo.ownerUserId === currentUserId,
    [currentUserId],
  );

  useEffect(() => {
    if (view !== "board" || photos.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const pickNext = () => setAmbientZoomIds(pickAmbientZoomIds(photos, 3));
    const firstTimer = window.setTimeout(pickNext, 0);
    const timer = window.setInterval(pickNext, 3600);
    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(timer);
    };
  }, [photos, view]);

  useEffect(() => {
    if (view !== "board") return;

    let frame = 0;
    const updateParallax = () => {
      frame = 0;
      const board = boardRef.current;
      if (!board) return;
      const cards = board.querySelectorAll<HTMLElement>(".board-photo");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        cards.forEach((card) => card.style.setProperty("--image-shift", "0px"));
        return;
      }
      const viewportCenter = window.innerHeight / 2;
      const strength = Math.min(window.innerHeight * 0.035, 28);

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const ratio = Math.max(-1, Math.min(1, (cardCenter - viewportCenter) / window.innerHeight));
        const depth = Number.parseFloat(getComputedStyle(card).getPropertyValue("--parallax-depth")) || 1;
        card.style.setProperty("--image-shift", `${(-ratio * strength * depth).toFixed(2)}px`);
      });
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [photos.length, view]);

  const handleBoardPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    board.style.setProperty("--cursor-x", `${x}%`);
    board.style.setProperty("--cursor-y", `${y}%`);
  }, []);

  const commitVote = useCallback(
    (photo: GalleryPhoto) => {
      if (isOwner(photo) || !loggedIn || !votingOpen) return;
      const id = photo.id;
      if (pendingIds.has(id) || votedIds.has(id)) return;

      setVotedIds((prev) => new Set(prev).add(id));
      setPendingIds((prev) => new Set(prev).add(id));

      voteAction(id)
        .then((res) => {
          if (!res.ok) {
            setVotedIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        })
        .catch(() => {
          setVotedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        })
        .finally(() => {
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
    },
    [isOwner, loggedIn, pendingIds, votedIds, votingOpen],
  );

  const commitUnvote = useCallback(
    (photo: GalleryPhoto) => {
      if (isOwner(photo) || !loggedIn || !votingOpen) return;
      const id = photo.id;
      if (pendingIds.has(id) || !votedIds.has(id)) return;

      setVotedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setPendingIds((prev) => new Set(prev).add(id));

      unvoteAction(id)
        .then((res) => {
          if (!res.ok) {
            setVotedIds((prev) => new Set(prev).add(id));
          }
        })
        .catch(() => {
          setVotedIds((prev) => new Set(prev).add(id));
        })
        .finally(() => {
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
    },
    [isOwner, loggedIn, pendingIds, votedIds, votingOpen],
  );

  const handleDelete = useCallback(
    (photo: GalleryPhoto) => {
      const id = photo.id;
      if (deletingId) return;
      setDeletingId(id);

      let removed: GalleryPhoto[] = [];
      setPhotos((prev) => {
        removed = prev;
        return prev.filter((p) => p.id !== id);
      });
      setSelectedId((current) => (current === id ? null : current));
      setConfirmDeleteId(null);

      deleteOwnPhotoAction(id)
        .then((res) => {
          if (!res.ok) {
            setPhotos((prev) =>
              prev.some((p) => p.id === id) ? prev : removed,
            );
          }
        })
        .catch(() => {
          setPhotos((prev) =>
            prev.some((p) => p.id === id) ? prev : removed,
          );
        })
        .finally(() => {
          setDeletingId((current) => (current === id ? null : current));
        });
    },
    [deletingId],
  );

  if (photos.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-28 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-[8px] border border-line bg-surface text-muted shadow-sm">
          <ImageIcon className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          No photos yet
        </h2>
        <p className="text-sm text-muted">
          The gallery is empty for now. Photos will show up here as people upload them.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="view-tabs">
        <button
          type="button"
          aria-label="Board view"
          className={view === "board" ? "is-active" : ""}
          onClick={() => setView("board")}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
            <line x1="12" y1="4.5" x2="12" y2="19.5" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Graph view"
          className={view === "graph" ? "is-active" : ""}
          onClick={() => setView("graph")}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="6" cy="17.5" r="2.4" />
            <circle cx="17.5" cy="6.5" r="2.4" />
            <circle cx="17.5" cy="17.5" r="2.4" />
            <line x1="7.8" y1="15.8" x2="15.8" y2="8.2" />
            <line x1="8.4" y1="17.5" x2="15.1" y2="17.5" />
          </svg>
        </button>
      </div>

      {view === "graph" ? (
        <ForceGallery
          photos={photos}
          votedIds={votedIds}
          isOwner={isOwner}
          onSelect={(p) => selectPhoto(p.id)}
          phrases={phrases}
          footer={loggedIn ? <PhraseSubmit /> : null}
        />
      ) : (
        <section
          ref={boardRef}
          className="gallery-board"
          onPointerMove={handleBoardPointerMove}
        >
      <div className="gallery-board-canvas">
        {photos.map((photo, index) => {
          const slot = slotMap.get(photo.id) ?? slotMap.size + index;
          const owner = isOwner(photo);
          const voted = owner || votedIds.has(photo.id);
          const aboveFold = slot < 10;
          const masonrySpan = masonrySpans[slot % masonrySpans.length];
          const isAmbientZoom = ambientZoomIds.has(photo.id);
          const zoomDelay = isAmbientZoom ? Array.from(ambientZoomIds).indexOf(photo.id) * 420 : 0;
          const parallaxDepth = 0.65 + ((slot * 37) % 9) * 0.09;

          return (
            <article
              key={photo.id}
              className={`board-photo ${voted ? "is-liked" : ""} ${isAmbientZoom ? "is-ambient-zoom" : ""}`}
              style={{
                "--masonry-span": masonrySpan,
                "--zoom-delay": `${zoomDelay}ms`,
                "--parallax-depth": parallaxDepth.toFixed(2),
                zIndex: slot + 1,
              } as CSSProperties}
              onClick={(event) => {
                event.stopPropagation();
                selectPhoto(photo.id);
              }}
            >
              <div className="board-photo-shell">
                <Image
                  src={photo.imageUrl}
                  alt={photo.caption}
                  fill
                  quality={92}
                  loading={aboveFold ? "eager" : "lazy"}
                  unoptimized
                  sizes="360px"
                  className="board-photo-image"
                />
                <div className="board-photo-shade" />
                <div className="board-photo-copy">
                  <h2>{photo.caption}</h2>
                  <p>{photo.uploaderName}</p>
                </div>
                <div className="board-like-slot">
                  <ThreeHeartButton
                    disabled={!loggedIn || !votingOpen || pendingIds.has(photo.id) || owner}
                    liked={voted}
                    label={
                      !loggedIn
                        ? "Sign in"
                        : owner
                          ? "Auto liked"
                          : voted
                            ? "Liked — tap to unlike"
                            : "Tap to like"
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!loggedIn) {
                        window.location.href = "/login";
                        return;
                      }
                      if (owner || !votingOpen || pendingIds.has(photo.id)) return;
                      if (voted) {
                        commitUnvote(photo);
                        return;
                      }
                      commitVote(photo);
                    }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
        </section>
      )}

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          liked={isOwner(selectedPhoto) || votedIds.has(selectedPhoto.id)}
          owner={isOwner(selectedPhoto)}
          loggedIn={loggedIn}
          votingOpen={votingOpen}
          votePending={pendingIds.has(selectedPhoto.id)}
          confirmingDelete={confirmDeleteId === selectedPhoto.id}
          deleting={deletingId === selectedPhoto.id}
          onClose={() => selectPhoto(null)}
          onToggleVote={(p) => {
            if (votedIds.has(p.id)) commitUnvote(p);
            else commitVote(p);
          }}
          onRequestDelete={(p) => setConfirmDeleteId(p.id)}
          onCancelDelete={() => setConfirmDeleteId(null)}
          onConfirmDelete={(p) => handleDelete(p)}
        />
      )}
    </>
  );
}
