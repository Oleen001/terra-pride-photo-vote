import Link from "next/link";
import { getParticipantSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { UploadForm } from "@/app/upload/upload-form";
import { LockIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const session = await getParticipantSession();
  const settings = await getSettings().catch(() => ({
    uploadOpen: false,
    votingOpen: false,
    revealResultsOpen: false,
  }));

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-10 sm:py-16">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          อัปโหลดรูปภาพ
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          เพิ่มภาพถ่ายของคุณเข้าสู่แกลเลอรี ระบบจะโหวตให้รูปของคุณโดยอัตโนมัติ
        </p>
      </div>

      {!settings.uploadOpen ? (
        <ClosedState />
      ) : !session ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            กรุณา{" "}
            <Link href="/login" className="font-medium underline hover:text-zinc-900 dark:hover:text-zinc-100">
              เข้าสู่ระบบ
            </Link>{" "}
            ก่อนอัปโหลด
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <UploadForm />
        </div>
      )}
    </main>
  );
}

function ClosedState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        <LockIcon className="h-5 w-5" />
      </span>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        ขณะนี้ปิดรับการอัปโหลด
      </h2>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        ผู้ดูแลยังไม่เปิดให้อัปโหลดรูปในขณะนี้ กรุณากลับมาใหม่ภายหลัง
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        กลับไปที่แกลเลอรี
      </Link>
    </div>
  );
}
