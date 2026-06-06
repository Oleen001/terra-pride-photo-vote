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
import { unvoteAction, voteAction } from "@/app/actions/vote";
import { getActivePhotosAction } from "@/app/actions/photos";

type GalleryProps = {
  photos: GalleryPhoto[];
  initialVotedIds: string[];
  votingOpen: boolean;
  loggedIn: boolean;
  currentUserId: string | null;
};

const baseBoardLayouts = [
  { x: 6, y: 7, w: 22, r: -7 },
  { x: 33, y: 4, w: 18, r: 5 },
  { x: 62, y: 8, w: 24, r: -2 },
  { x: 16, y: 43, w: 19, r: 8 },
  { x: 45, y: 38, w: 23, r: -9 },
  { x: 75, y: 42, w: 17, r: 6 },
  { x: 5, y: 76, w: 25, r: -3 },
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
      x: 4 + col * xStep + jitterX,
      y: 5 + row * yStep + jitterY,
      w: cardWidth + (index % 3) * 1.2,
      r: ((index * 11) % 14) - 7,
    };
  });
}

function uploaderName(email: string) {
  const name = email.split("@")[0] ?? email;
  return name.replace(/[._-]+/g, " ").trim() || name;
}

export function Gallery({
  photos: initialPhotos,
  initialVotedIds,
  votingOpen,
  loggedIn,
  currentUserId,
}: GalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [view, setView] = useState<"board" | "graph">("board");

  // Live polling: pull active photos every 8s so new uploads appear without a
  // manual refresh (for the event TV). Only updates state when the set changed.
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const fresh = await getActivePhotosAction();
        setPhotos((prev) => {
          if (fresh.length === prev.length && fresh.every((p, i) => p.id === prev[i]?.id)) {
            return prev;
          }
          return fresh;
        });
      } catch {
        /* ignore transient poll errors */
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(() => new Set(initialVotedIds));
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [burstId, setBurstId] = useState<string | null>(null);
  const boardRef = useRef<HTMLElement | null>(null);
  const [scrollShift, setScrollShift] = useState(0);
  const boardLayouts = useMemo(() => createBoardLayouts(photos.length), [photos.length]);

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
      setBurstId(id);
      window.setTimeout(() => setBurstId(null), 1500);

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

  if (photos.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-28 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-[8px] border border-line bg-surface text-muted shadow-sm">
          <ImageIcon className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          ยังไม่มีรูปภาพ
        </h2>
        <p className="text-sm text-muted">
          แกลเลอรียังว่างอยู่ เมื่อมีคนอัปโหลดรูป จะปรากฏที่นี่
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="view-tabs">
        <button
          type="button"
          className={view === "board" ? "is-active" : ""}
          onClick={() => setView("board")}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
            <line x1="12" y1="4.5" x2="12" y2="19.5" />
          </svg>
          <span className="view-tab-text">บอร์ด <small>Board</small></span>
        </button>
        <button
          type="button"
          className={view === "graph" ? "is-active" : ""}
          onClick={() => setView("graph")}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="6" cy="17.5" r="2.4" />
            <circle cx="17.5" cy="6.5" r="2.4" />
            <circle cx="17.5" cy="17.5" r="2.4" />
            <line x1="7.8" y1="15.8" x2="15.8" y2="8.2" />
            <line x1="8.4" y1="17.5" x2="15.1" y2="17.5" />
          </svg>
          <span className="view-tab-text">กราฟ <small>Graph</small></span>
        </button>
      </div>

      {view === "graph" ? (
        <ForceGallery
          photos={photos}
          votedIds={votedIds}
          isOwner={isOwner}
          onSelect={(p) => setSelectedId(p.id)}
        />
      ) : (
        <section
          ref={boardRef}
          className={`gallery-board ${selectedPhoto ? "is-zoomed" : ""}`}
          onPointerMove={handleBoardPointerMove}
          onClick={() => {
            if (selectedPhoto) setSelectedId(null);
          }}
        >
      {selectedPhoto && (
        <button
          type="button"
          className="board-zoom-out"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedId(null);
          }}
          aria-label="Zoom out to full board"
          title="Zoom out"
        >
          −
        </button>
      )}

      <div className="gallery-board-canvas">
        {photos.map((photo, index) => {
          const layout = boardLayouts[index % boardLayouts.length];
          const owner = isOwner(photo);
          const voted = owner || votedIds.has(photo.id);
          const selected = selectedPhoto?.id === photo.id;
          const bursting = burstId === photo.id;
          const parallax = ((index % 5) - 2) * 18;

          return (
            <article
              key={photo.id}
              className={`board-photo ${selected ? "is-selected" : ""} ${
                voted ? "is-liked" : ""
              }`}
              style={{
                "--board-x": `${layout.x}%`,
                "--board-y": `${layout.y}%`,
                "--board-w": `${layout.w}%`,
                "--board-r": `${layout.r}deg`,
                "--scroll-shift": `${scrollShift * parallax}px`,
                "--float-delay": `${index * -0.7}s`,
                "--float-duration": `${5.5 + (index % 4) * 0.7}s`,
                zIndex: selected ? 30 : index + 1,
              } as CSSProperties}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId(photo.id);
              }}
            >
              <div className="board-photo-shell">
                <Image
                  src={photo.imageUrl}
                  alt={photo.caption}
                  fill
                  quality={92}
                  unoptimized
                  sizes={selected ? "(max-width: 768px) 85vw, 620px" : "360px"}
                  className="board-photo-image"
                />
                <div className="board-photo-shade" />
                <div className="board-photo-copy">
                  <h2>{photo.caption}</h2>
                  <p>{uploaderName(photo.ownerEmail)}</p>
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
                            ? "ถูกใจแล้ว แตะเพื่อยกเลิก"
                            : "แตะเพื่อถูกใจ"
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
                {bursting && (
                  <div className="heart-burst" aria-hidden="true">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <span key={i} style={{ "--i": i } as CSSProperties}>
                        ♥
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
        </section>
      )}

      {view === "graph" && selectedPhoto && (
        <div className="graph-modal" onClick={() => setSelectedId(null)}>
          <div className="graph-modal-card" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.caption}
              fill
              unoptimized
              sizes="(max-width: 768px) 92vw, 620px"
              className="graph-modal-img"
            />
            <button
              type="button"
              className="graph-modal-close"
              aria-label="ปิด"
              onClick={() => setSelectedId(null)}
            >
              ×
            </button>
            <div className="graph-modal-info">
              <div className="min-w-0">
                <h2>{selectedPhoto.caption}</h2>
                <p>{uploaderName(selectedPhoto.ownerEmail)}</p>
              </div>
              <ThreeHeartButton
                disabled={
                  !loggedIn || !votingOpen || pendingIds.has(selectedPhoto.id) || isOwner(selectedPhoto)
                }
                liked={isOwner(selectedPhoto) || votedIds.has(selectedPhoto.id)}
                label={
                  isOwner(selectedPhoto)
                    ? "Auto liked"
                    : votedIds.has(selectedPhoto.id)
                      ? "ถูกใจแล้ว"
                      : "ถูกใจ"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  const p = selectedPhoto;
                  if (!loggedIn) {
                    window.location.href = "/login";
                    return;
                  }
                  if (isOwner(p) || !votingOpen || pendingIds.has(p.id)) return;
                  if (votedIds.has(p.id)) commitUnvote(p);
                  else commitVote(p);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
