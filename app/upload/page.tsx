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
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
          Add to Gallery
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-normal text-foreground">
          อัปโหลดรูปภาพ
        </h1>
        <p className="text-sm leading-6 text-muted">
          เพิ่มภาพถ่ายของคุณเข้าสู่แกลเลอรี ระบบจะโหวตให้รูปของคุณโดยอัตโนมัติ
        </p>
      </div>

      {!settings.uploadOpen ? (
        <ClosedState />
      ) : !session ? (
        <div className="rounded-[8px] border border-line bg-surface p-6 text-center shadow-sm">
          <p className="text-sm text-muted">
            กรุณา{" "}
            <Link href="/login" className="font-medium underline hover:text-foreground">
              เข้าสู่ระบบ
            </Link>{" "}
            ก่อนอัปโหลด
          </p>
        </div>
      ) : (
        <div className="rounded-[8px] border border-line bg-surface p-6 shadow-[0_18px_55px_rgba(36,28,20,0.08)]">
          <UploadForm />
        </div>
      )}
    </main>
  );
}

function ClosedState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[8px] border border-line bg-surface px-6 py-14 text-center shadow-sm">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-foreground/6 text-muted">
        <LockIcon className="h-5 w-5" />
      </span>
      <h2 className="text-base font-semibold text-foreground">
        ขณะนี้ปิดรับการอัปโหลด
      </h2>
      <p className="max-w-xs text-sm text-muted">
        ผู้ดูแลยังไม่เปิดให้อัปโหลดรูปในขณะนี้ กรุณากลับมาใหม่ภายหลัง
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-9 items-center rounded-[8px] bg-foreground px-4 text-[13px] font-semibold text-background shadow-sm transition hover:translate-y-[-1px] hover:shadow-md"
      >
        กลับไปที่แกลเลอรี
      </Link>
    </div>
  );
}
