"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import type { GalleryPhoto } from "@/lib/photos";
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

type HoldVoteControlProps = {
  voted: boolean;
  isOwner: boolean;
  votingOpen: boolean;
  loggedIn: boolean;
  pending: boolean;
  onCommit: () => void;
};

const holdDurationMs = 2000;

function uploaderName(email: string) {
  const name = email.split("@")[0] ?? email;
  return name.replace(/[._-]+/g, " ").trim() || name;
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function relativeIndex(index: number, activeIndex: number, length: number) {
  const raw = index - activeIndex;
  const half = Math.floor(length / 2);
  if (raw > half) return raw - length;
  if (raw < -half) return raw + length;
  return raw;
}

function HoldVoteControl({
  voted,
  isOwner,
  votingOpen,
  loggedIn,
  pending,
  onCommit,
}: HoldVoteControlProps) {
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [charging, setCharging] = useState(false);

  const clearCharge = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startedAtRef.current = null;
    setCharging(false);
    setProgress(0);
  }, []);

  useEffect(() => clearCharge, [clearCharge]);

  if (!loggedIn) {
    return (
      <a
        href="/login"
        onClick={(event) => event.stopPropagation()}
        className="carousel-like carousel-like-idle"
      >
        Sign in
      </a>
    );
  }

  if (isOwner) {
    return (
      <span
        title="คุณโหวตรูปของตัวเองโดยอัตโนมัติ"
        className="carousel-like carousel-like-liked"
        onClick={(event) => event.stopPropagation()}
      >
        Auto liked
      </span>
    );
  }

  if (!votingOpen) {
    return (
      <span
        title="ขณะนี้ปิดการโหวต"
        className="carousel-like carousel-like-disabled"
        onClick={(event) => event.stopPropagation()}
      >
        Closed
      </span>
    );
  }

  if (voted) {
    return (
      <span
        className="carousel-like carousel-like-liked"
        onClick={(event) => event.stopPropagation()}
      >
        Liked
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      className={`carousel-like carousel-like-hold ${charging ? "is-charging" : ""}`}
      style={{ "--hold-progress": progress } as CSSProperties}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        if (pending) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        startedAtRef.current = performance.now();
        setCharging(true);
        const tick = () => {
          if (startedAtRef.current === null) return;
          const elapsed = performance.now() - startedAtRef.current;
          setProgress(Math.min(elapsed / holdDurationMs, 1));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        const ready = progress >= 1;
        clearCharge();
        if (!ready || pending) return;
        onCommit();
      }}
      onPointerCancel={(event) => {
        event.stopPropagation();
        clearCharge();
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        if (charging) clearCharge();
      }}
      aria-label="Hold for two seconds to like this photo"
    >
      <span className="carousel-like-heart">♥</span>
      <span>{pending ? "Saving…" : charging ? "Hold…" : "Like"}</span>
    </button>
  );
}

export function Gallery({
  photos: initialPhotos,
  initialVotedIds,
  votingOpen,
  loggedIn,
  currentUserId,
}: GalleryProps) {
  const reduce = useReducedMotion();
  const [photos, setPhotos] = useState(initialPhotos);
  const [activeIndex, setActiveIndex] = useState(0);
  const [votedIds, setVotedIds] = useState<Set<string>>(() => new Set(initialVotedIds));
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const dragDeltaRef = useRef(0);
  const swipedRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

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

  const setWrappedIndex = useCallback(
    (index: number) => setActiveIndex(wrapIndex(index, photos.length)),
    [photos.length],
  );

  const commitVote = useCallback(
    (photo: GalleryPhoto) => {
      if (isOwner(photo) || !loggedIn || !votingOpen) return;
      const id = photo.id;
      if (pendingIds.has(id) || votedIds.has(id)) return;

      setVotedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setPending(id, true);

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
        .finally(() => setPending(id, false));
    },
    [isOwner, loggedIn, votingOpen, pendingIds, votedIds, setPending],
  );

  const toggleVote = useCallback(
    (photo: GalleryPhoto) => {
      if (isOwner(photo) || !loggedIn || !votingOpen) return;
      const id = photo.id;
      if (pendingIds.has(id)) return;
      const wasVoted = votedIds.has(id);

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
    setActiveIndex((prev) => Math.max(0, Math.min(prev, photos.length - 2)));
  }, [photos.length]);

  useEffect(() => {
    if (photos.length <= 1 || dragging || reduce) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => wrapIndex(prev + 1, photos.length));
    }, 5600);
    return () => window.clearInterval(timer);
  }, [dragging, photos.length, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setWrappedIndex(activeIndex - 1);
      else if (e.key === "ArrowRight") setWrappedIndex(activeIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, setWrappedIndex]);

  const activePhoto = useMemo(
    () => photos.find((p) => p.id === activeId) ?? null,
    [photos, activeId],
  );

  const votableTotal = useMemo(
    () => photos.filter((p) => p.ownerUserId !== currentUserId).length,
    [photos, currentUserId],
  );
  const votedCount = useMemo(
    () => photos.filter((p) => p.ownerUserId !== currentUserId && votedIds.has(p.id)).length,
    [photos, currentUserId, votedIds],
  );
  const ambientSrc =
    photos[activeIndex]?.thumbnailUrl ?? photos[activeIndex]?.imageUrl ?? null;

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
      <div className="carousel-ambient" aria-hidden="true">
        {ambientSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={ambientSrc} src={ambientSrc} alt="" className="carousel-ambient-img" />
        )}
      </div>

      {loggedIn && votingOpen && votableTotal > 0 && (
        <div className="vote-progress">
          <span className="vote-progress-label">
            โหวตแล้ว {votedCount}/{votableTotal} รูป
          </span>
          <div className="vote-progress-track">
            <div
              className="vote-progress-fill"
              style={{ width: `${(votedCount / votableTotal) * 100}%` }}
            />
          </div>
        </div>
      )}

      <section
        className="photo-carousel"
        onPointerDown={(event) => {
          swipedRef.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragStartRef.current = event.clientX;
          dragDeltaRef.current = 0;
          setDragging(true);
        }}
        onPointerMove={(event) => {
          if (dragStartRef.current === null) return;
          const delta = event.clientX - dragStartRef.current;
          dragDeltaRef.current = delta;
          if (Math.abs(delta) < 8) return; // deadzone: ignore jitter / vertical intent
          if (stageRef.current) {
            stageRef.current.style.transition = "none";
            stageRef.current.style.transform = `translateX(${delta * 0.55}px)`;
          }
        }}
        onPointerUp={() => {
          const delta = dragDeltaRef.current;
          dragStartRef.current = null;
          dragDeltaRef.current = 0;
          setDragging(false);
          if (stageRef.current) {
            stageRef.current.style.transition =
              "transform 420ms cubic-bezier(0.21, 0.47, 0.32, 0.98)";
            stageRef.current.style.transform = "";
          }
          swipedRef.current = Math.abs(delta) >= 46;
          if (Math.abs(delta) < 46) return;
          setWrappedIndex(activeIndex + (delta < 0 ? 1 : -1));
        }}
        onPointerCancel={() => {
          dragStartRef.current = null;
          dragDeltaRef.current = 0;
          setDragging(false);
          if (stageRef.current) {
            stageRef.current.style.transition = "transform 420ms ease";
            stageRef.current.style.transform = "";
          }
        }}
      >
        <div className="photo-carousel-stage" ref={stageRef} aria-live="polite">
          {photos.map((photo, i) => {
            const owner = isOwner(photo);
            const voted = owner || votedIds.has(photo.id);
            const relative = relativeIndex(i, activeIndex, photos.length);
            const distance = Math.abs(relative);
            const angle = relative * 36;
            const visible = distance <= 2;
            const x = Math.sin((angle * Math.PI) / 180) * 460;
            const z = 80 - distance * 130;
            const rotateY = -relative * 26;
            const rotateZ = relative === 0 ? -1.5 : relative * 2;
            const scale = Math.max(0.74, 1 - distance * 0.12);

            return (
              <article
                key={photo.id}
                className={`carousel-card ${voted ? "is-liked" : ""}`}
                style={{
                  "--carousel-x": `${x}px`,
                  "--carousel-z": `${z}px`,
                  "--carousel-ry": `${rotateY}deg`,
                  "--carousel-rz": `${rotateZ}deg`,
                  "--carousel-scale": scale,
                  "--carousel-opacity": visible ? 1 - distance * 0.18 : 0,
                  zIndex: 20 - distance,
                  pointerEvents: visible ? "auto" : "none",
                } as CSSProperties}
                onPointerMove={(event) => {
                  if (reduce) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const px = (event.clientX - rect.left) / rect.width;
                  const py = (event.clientY - rect.top) / rect.height;
                  event.currentTarget.style.setProperty("--card-rx", `${(0.5 - py) * 9}deg`);
                  event.currentTarget.style.setProperty("--card-ry", `${(px - 0.5) * 12}deg`);
                  event.currentTarget.style.setProperty("--glare-x", `${px * 100}%`);
                  event.currentTarget.style.setProperty("--glare-y", `${py * 100}%`);
                }}
                onPointerLeave={(event) => {
                  event.currentTarget.style.setProperty("--card-rx", "0deg");
                  event.currentTarget.style.setProperty("--card-ry", "0deg");
                }}
                onClick={() => {
                  if (swipedRef.current) {
                    swipedRef.current = false;
                    return;
                  }
                  if (i !== activeIndex) {
                    setWrappedIndex(i);
                    return;
                  }
                  setActiveId(photo.id);
                }}
              >
                <div className="carousel-card-shell">
                  <Image
                    src={photo.imageUrl}
                    alt={photo.caption}
                    fill
                    sizes="(max-width: 640px) 92vw, 640px"
                    priority={i === activeIndex}
                    unoptimized
                    draggable={false}
                    className="carousel-card-image"
                  />
                  <div className="carousel-card-shade" />
                  <div className="carousel-card-copy">
                    <h2>{uploaderName(photo.ownerEmail)}</h2>
                    <p>{photo.caption}</p>
                  </div>
                  <div className="carousel-card-action">
                    <HoldVoteControl
                      voted={voted}
                      isOwner={owner}
                      votingOpen={votingOpen}
                      loggedIn={loggedIn}
                      pending={pendingIds.has(photo.id)}
                      onCommit={() => commitVote(photo)}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="carousel-dots" aria-hidden="true">
          {photos.map((photo, i) => (
            <span key={photo.id} className={i === activeIndex ? "is-active" : ""} />
          ))}
        </div>
      </section>

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
