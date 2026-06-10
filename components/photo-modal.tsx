"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "@/lib/photos";
import { CloseIcon, TrashIcon } from "@/components/icons";
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
  onClose: () => void;
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
  onClose,
  onToggleVote,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: PhotoModalProps) {
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState<ModalImageSize | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
  }, []);

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
      >
        <Image
          src={photo.imageUrl}
          alt={photo.caption}
          fill
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
            disabled={!loggedIn || !votingOpen || votePending || owner}
            liked={liked}
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
                window.location.href = "/login";
                return;
              }
              if (owner || !votingOpen || votePending) return;
              onToggleVote(photo);
            }}
          />
        </div>
      </div>
    </div>
  );
}
