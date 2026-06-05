import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getTopPhotos } from "@/lib/photos";
import { ResultsList } from "@/components/results-list";
import { TrophyIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const settings = await getSettings().catch(() => ({
    uploadOpen: false,
    votingOpen: false,
    revealResultsOpen: false,
  }));

  const photos = settings.revealResultsOpen ? await getTopPhotos(10) : [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:py-16">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <TrophyIcon className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Top 10
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          ภาพถ่ายที่ได้รับโหวตสูงสุด
        </p>
      </div>

      {!settings.revealResultsOpen ? (
        <NotRevealed />
      ) : photos.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            ยังไม่มีรูปภาพที่จะจัดอันดับ
          </p>
        </div>
      ) : (
        <ResultsList photos={photos} />
      )}
    </main>
  );
}

function NotRevealed() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        ยังไม่ประกาศผล
      </h2>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        ผลโหวตจะถูกเปิดเผยเมื่อผู้ดูแลประกาศ Top 10 อย่างเป็นทางการ
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
