"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { uploadPhotoAction } from "@/app/upload/actions";
import { UploadIcon, ImageIcon, CloseIcon } from "@/components/icons";
import { BurstTextarea } from "@/components/burst-input";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
const MAX_BYTES = 20 * 1024 * 1024;

export function UploadForm() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Revoke the object URL when the preview changes or the form unmounts,
  // so failed/abandoned selections don't leak memory.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function resetFile() {
    setPreview(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      resetFile();
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is larger than 20MB");
      resetFile();
      return;
    }
    setFileName(file.name);
    // Browsers (Chrome/Android) can't render HEIC previews — skip the object
    // URL and show a placeholder. The server converts HEIC → WebP on upload.
    const ext = file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase();
    const isHeic = ext === "heic" || ext === "heif";
    setPreview(isHeic ? null : URL.createObjectURL(file));
  }

  function clearFile() {
    setError(null);
    resetFile();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await uploadPhotoAction(formData);
        if (res.ok) {
          router.push("/");
          router.refresh();
        } else {
          setError(res.error ?? "Upload failed");
        }
      } catch {
        setError("Connection error. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Photo</span>

        {!fileName ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-line bg-background text-center outline-none transition duration-200 hover:-translate-y-0.5 hover:border-accent focus-visible:border-accent"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-muted shadow-sm transition-colors group-hover:text-accent">
              <ImageIcon className="h-6 w-6" />
            </span>
            <span className="text-sm font-medium text-foreground">
              Choose a photo
            </span>
            <span className="text-xs text-muted">
              jpg, png, webp, heic · up to 20MB
            </span>
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-[8px] border border-line bg-background">
            {preview ? (
              <div className="relative max-h-80 w-full">
                <Image
                  src={preview}
                  alt="Selected photo preview"
                  width={800}
                  height={600}
                  unoptimized
                  className="h-auto max-h-80 w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-center text-muted">
                <ImageIcon className="h-10 w-10" />
                <span className="text-xs">HEIC previews can&apos;t be shown in the browser<br />We&apos;ll convert it to WebP automatically</span>
              </div>
            )}
            <button
              type="button"
              onClick={clearFile}
              aria-label="Remove selected image"
              className="absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-zinc-950/70 text-white backdrop-blur transition-colors duration-200 hover:bg-zinc-950/90"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
            {fileName && (
              <p className="truncate border-t border-line bg-surface px-3 py-2 text-xs text-muted">
                {fileName}
              </p>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={ACCEPT}
          required
          onChange={onFileChange}
          className="sr-only"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="caption" className="text-sm font-medium text-foreground">
          Caption
        </label>
        <BurstTextarea
          id="caption"
          name="caption"
          required
          rows={3}
          maxLength={280}
          placeholder="Tell the story behind this photo…"
          className="field-input resize-none"
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <button type="submit" disabled={pending} className="field-button">
        {pending ? (
          "Uploading…"
        ) : (
          <>
            <UploadIcon className="h-4 w-4" />
            Upload photo
          </>
        )}
      </button>
    </form>
  );
}
