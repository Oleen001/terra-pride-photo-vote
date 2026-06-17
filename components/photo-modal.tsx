"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "@/lib/photos";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, TrashIcon } from "@/components/icons";
import { ThreeHeartButton } from "@/components/three-heart-button";

type PhotoModalProps = {
  photo: GalleryPhoto;
  liked: boolean;
  owner: boolean;
  loggedIn: boolean;
  votingOpen: boolean;
  votePending: boolean;
  confirmingDelete: boolean;
  deleting: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  position: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleVote: (photo: GalleryPhoto) => void;
  onRequestDelete: (photo: GalleryPhoto) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (photo: GalleryPhoto) => void;
};

type ModalImageSize = {
  width: number;
  height: number;
};

function fitImageToViewport(ratio: number): ModalImageSize {
  const maxWidth = Math.min(window.innerWidth * 0.92, 980);
  const maxHeight = window.innerHeight - 48;
  if (maxWidth / ratio <= maxHeight) {
    return { width: maxWidth, height: maxWidth / ratio };
  }
  return { width: maxHeight * ratio, height: maxHeight };
}

export function PhotoModal({
  photo,
  liked,
  owner,
  loggedIn,
  votingOpen,
  votePending,
  confirmingDelete,
  deleting,
  hasPrevious,
  hasNext,
  position,
  total,
  onClose,
  onPrevious,
  onNext,
  onToggleVote,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: PhotoModalProps) {
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState<ModalImageSize | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft" && hasPrevious) {
        event.preventDefault();
        onPrevious();
        return;
      }
      if (event.key === "ArrowRight" && hasNext) {
        event.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasNext, hasPrevious, onClose, onNext, onPrevious]);

  useEffect(() => {
    if (!imageRatio) return;

    const onResize = () => {
      setImageSize(fitImageToViewport(imageRatio));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [imageRatio]);

  // Move focus into the dialog on open (a11y).
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, [photo.id]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const horizontal = Math.abs(dx);
    const vertical = Math.abs(dy);
    if (horizontal < 60 || horizontal < vertical * 1.35) return;

    if (dx < 0 && hasNext) {
      onNext();
    } else if (dx > 0 && hasPrevious) {
      onPrevious();
    }
  };

  return (
    <div
      className="photo-modal"
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption}
      onClick={onClose}
    >
      <div
        className="photo-modal-card"
        style={
          {
            "--modal-image-ratio": imageRatio ?? 1,
            width: imageSize ? `${imageSize.width}px` : undefined,
            height: imageSize ? `${imageSize.height}px` : undefined,
          } as CSSProperties
        }
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStartRef.current = null;
        }}
      >
        <Image
          src={photo.imageUrl}
          alt={photo.caption}
          fill
          priority
          unoptimized
          sizes="min(92vw, 980px)"
          className="photo-modal-img"
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (naturalWidth > 0 && naturalHeight > 0) {
              const ratio = naturalWidth / naturalHeight;
              setImageRatio(ratio);
              setImageSize(fitImageToViewport(ratio));
            }
          }}
        />

        <div className="photo-modal-top">
          {owner && (
            confirmingDelete ? (
              <div className="photo-modal-confirm" role="group" aria-label="Confirm delete">
                <button
                  type="button"
                  className="photo-modal-confirm-yes"
                  disabled={deleting}
                  onClick={() => onConfirmDelete(photo)}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  className="photo-modal-confirm-no"
                  disabled={deleting}
                  onClick={onCancelDelete}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="photo-modal-trash"
                aria-label="Delete photo"
                title="Delete photo"
                onClick={() => onRequestDelete(photo)}
              >
                <TrashIcon width={18} height={18} aria-hidden="true" />
              </button>
            )
          )}

          <button
            ref={closeRef}
            type="button"
            className="photo-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <CloseIcon width={20} height={20} aria-hidden="true" />
          </button>
        </div>

        <div className="photo-modal-info">
          <div className="min-w-0">
            <h2>{photo.caption}</h2>
            <p>{photo.uploaderName}</p>
          </div>
          <ThreeHeartButton
            disabled={loggedIn && (!votingOpen || votePending || owner)}
            liked={liked}
            burstOnClick={loggedIn}
            label={
              !loggedIn
                ? "Sign in to like"
                : owner
                  ? "Auto liked"
                  : liked
                    ? "Liked — tap to unlike"
                    : "Tap to like"
            }
            onClick={(e) => {
              e.stopPropagation();
              if (!loggedIn) {
                const next = `${window.location.pathname}${window.location.search}`;
                window.location.href = `/login?next=${encodeURIComponent(next || "/")}`;
                return;
              }
              if (owner || !votingOpen || votePending) return;
              onToggleVote(photo);
            }}
          />
        </div>
      </div>

      <button
        type="button"
        className="photo-modal-nav photo-modal-nav-prev"
        aria-label={`Previous photo, ${position} of ${total}`}
        disabled={!hasPrevious}
        onClick={(e) => {
          e.stopPropagation();
          if (hasPrevious) onPrevious();
        }}
      >
        <ChevronLeftIcon width={28} height={28} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="photo-modal-nav photo-modal-nav-next"
        aria-label={`Next photo, ${position} of ${total}`}
        disabled={!hasNext}
        onClick={(e) => {
          e.stopPropagation();
          if (hasNext) onNext();
        }}
      >
        <ChevronRightIcon width={28} height={28} aria-hidden="true" />
      </button>
    </div>
  );
}
