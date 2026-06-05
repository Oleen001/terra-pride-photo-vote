"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { uploadPhotoAction } from "@/app/upload/actions";
import { UploadIcon, ImageIcon, CloseIcon } from "@/components/icons";

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
      setError("ไฟล์ใหญ่เกิน 20MB");
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
          setError(res.error ?? "อัปโหลดไม่สำเร็จ");
        }
      } catch {
        setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">รูปภาพ</span>

        {!fileName ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center transition-colors duration-200 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-zinc-400 shadow-sm transition-colors group-hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500">
              <ImageIcon className="h-6 w-6" />
            </span>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              เลือกรูปภาพ
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              jpg, png, webp, heic · สูงสุด 20MB
            </span>
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
            {preview ? (
              <div className="relative max-h-80 w-full">
                <Image
                  src={preview}
                  alt="ตัวอย่างรูปที่เลือก"
                  width={800}
                  height={600}
                  unoptimized
                  className="h-auto max-h-80 w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-center text-zinc-400 dark:text-zinc-500">
                <ImageIcon className="h-10 w-10" />
                <span className="text-xs">ตัวอย่าง HEIC แสดงไม่ได้ในเบราว์เซอร์<br />ระบบจะแปลงเป็น WebP ให้อัตโนมัติ</span>
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
              <p className="truncate border-t border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
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
        <label htmlFor="caption" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          คำบรรยายภาพ
        </label>
        <textarea
          id="caption"
          name="caption"
          required
          rows={3}
          maxLength={280}
          placeholder="บอกเล่าเรื่องราวของรูปนี้…"
          className="resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
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

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? (
          "กำลังอัปโหลด…"
        ) : (
          <>
            <UploadIcon className="h-4 w-4" />
            อัปโหลดรูปภาพ
          </>
        )}
      </button>
    </form>
  );
}
