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

const baseBoardLayouts = [
  { x: 12, y: 13, w: 21, r: -5 },
  { x: 35, y: 8, w: 18, r: 4 },
  { x: 62, y: 11, w: 23, r: -2 },
  { x: 15, y: 43, w: 19, r: 7 },
  { x: 45, y: 38, w: 23, r: -8 },
  { x: 74, y: 43, w: 17, r: 5 },
  { x: 8, y: 76, w: 24, r: -3 },
  { x: 39, y: 74, w: 18, r: 7 },
  { x: 68, y: 72, w: 23, r: -6 },
];

function createBoardLayouts(count: number) {
  if (count <= baseBoardLayouts.length) return baseBoardLayouts.slice(0, count);

  const columns = count > 24 ? 6 : count > 14 ? 5 : 4;
  const rows = Math.ceil(count / columns);
  const cardWidth = count > 24 ? 12 : count > 14 ? 14 : 17;
  const xStep = 92 / columns;
  const yStep = 88 / rows;

  return Array.from({ length: count }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const jitterX = ((index * 13) % 7) - 3;
    const jitterY = ((index * 17) % 9) - 4;
    return {
      x: Math.min(86, Math.max(8, 6 + col * xStep + jitterX)),
      y: Math.min(88, Math.max(10, 9 + row * yStep + jitterY)),
      w: cardWidth + (index % 3) * 1.2,
      r: ((index * 11) % 14) - 7,
    };
  });
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
  const boardRef = useRef<HTMLElement | null>(null);
  const [scrollShift, setScrollShift] = useState(0);
  const boardLayouts = useMemo(() => createBoardLayouts(photos.length), [photos.length]);

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
    let ticking = false;
    const updateScrollShift = () => {
      ticking = false;
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const travel = Math.max(rect.height - window.innerHeight, 1);
      const progress = Math.min(Math.max(-rect.top / travel, 0), 1);
      setScrollShift(progress);
    };
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateScrollShift);
    };

    updateScrollShift();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

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
          const layout = boardLayouts[slot % boardLayouts.length];
          const owner = isOwner(photo);
          const voted = owner || votedIds.has(photo.id);
          const parallax = ((slot % 5) - 2) * 18;
          const aboveFold = layout.y < 58;

          return (
            <article
              key={photo.id}
              className={`board-photo ${voted ? "is-liked" : ""}`}
              style={{
                "--board-x": `${layout.x}%`,
                "--board-y": `${layout.y}%`,
                "--board-w": `${layout.w}%`,
                "--board-r": `${layout.r}deg`,
                "--scroll-shift": `${scrollShift * parallax}px`,
                "--float-delay": `${slot * -0.7}s`,
                "--float-duration": `${5.5 + (slot % 4) * 0.7}s`,
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
